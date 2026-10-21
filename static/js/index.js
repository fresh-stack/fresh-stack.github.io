window.HELP_IMPROVE_VIDEOJS = false;

let fullLeaderboardData = null;

/** Average (5 domains) metric vs parameters; dataset key is always `average`. */
const AVERAGE_METRIC_PLOTS = [
	{
		plotId: 'plot-avg-r50',
		metricKey: 'recall_50',
		yTitle: 'R@50 (Avg. 5)',
		hoverMetric: 'Recall@50',
		yMin: 0.15,
		yMax: 0.755
	},
	{
		plotId: 'plot-avg-alpha10',
		metricKey: 'alpha_ndcg_10',
		yTitle: 'α@10 (Avg. 5)',
		hoverMetric: 'α@10',
		yMin: 0.1,
		yMax: 0.541
	},
	{
		plotId: 'plot-avg-c20',
		metricKey: 'coverage_20',
		yTitle: 'C@20 (Avg. 5)',
		hoverMetric: 'C@20',
		yMin: 0.25,
		yMax: 0.868
	}
];
const AVERAGE_METRIC_DATE_PLOTS = [
	{
		plotId: 'plot-date-avg-r50',
		metricKey: 'recall_50',
		yTitle: 'R@50 (Avg. 5)',
		hoverMetric: 'Recall@50',
		yMin: 0.15,
		yMax: 0.755
	},
	{
		plotId: 'plot-date-avg-alpha10',
		metricKey: 'alpha_ndcg_10',
		yTitle: 'α@10 (Avg. 5)',
		hoverMetric: 'α@10',
		yMin: 0.1,
		yMax: 0.541
	},
	{
		plotId: 'plot-date-avg-c20',
		metricKey: 'coverage_20',
		yTitle: 'C@20 (Avg. 5)',
		hoverMetric: 'C@20',
		yMin: 0.25,
		yMax: 0.868
	}
];

const RECALL_TYPE_ORDER = ['upper_baseline', 'open_source', 'proprietary', 'late_interaction'];
const RECALL_TYPE_LABELS = {
	upper_baseline: 'Oracle (Stack Overflow nuggets)',
	open_source: 'Open source',
	proprietary: 'Proprietary',
	late_interaction: 'Late interaction'
};
const TYPE_SYMBOLS = {
	upper_baseline: 'star',
	open_source: 'circle',
	proprietary: 'diamond',
	late_interaction: 'square'
};
const PINNED_FAMILY_COLORS = {
	'Stella': '#1f77b4',
	'Harrier OSS': '#ff7f0e',
	'Voyage': '#009688',
	'Jina': '#d62728',
	'Qwen3': '#9467bd',
	'IBM Granite': '#8c564b',
	'Arctic Embed': '#e377c2',
	'Perplexity Embed': '#17becf',
	'GTE': '#bcbd22',
	'BGE': '#7f7f7f',
	'E5': '#393b79',
	'OpenAI Embedding': '#637939',
	'Nomic Embed': '#6a1b9a',
	'Cohere Embed': '#843c39',
	'EmbeddingGemma': '#e91e63',
	'Gemini Embedding': '#4285f4',
	'Tarka': '#43a047',
	'Jasper': '#756bb1',
	'Nemotron-Embed': '#76b900',
	'Octen-Embedding': '#f2b705',
	'LightOn': '#00bfa5',
	'z-embed': '#263238',
	'Fusion': '#e6550d',
	'BM25': '#969696',
	'Other': '#9e9e9e'
};
const FAMILY_COLOR_PALETTE = [
	'#3949ab', '#00897b', '#e53935', '#8e24aa', '#f4511e', '#1e88e5',
	'#43a047', '#6d4c41', '#00acc1', '#7cb342', '#5e35b1', '#c2185b',
	'#ff8f00', '#546e7a', '#2e7d32', '#ad1457', '#039be5', '#ef6c00'
];

function inferModelFamily(rawName) {
	const name = String(rawName || '').toLowerCase().replace(/^oracle:\s*/i, '');
	const familyRules = [
		{ key: 'nemotron', label: 'Nemotron-Embed' },
		{ key: 'octen', label: 'Octen-Embedding' },
		{ key: 'denseon', label: 'LightOn' },
		{ key: 'slideon', label: 'LightOn' },
		{ key: 'lateon', label: 'LightOn' },
		{ key: 'zembed', label: 'z-embed' },
		{ key: 'stella', label: 'Stella' },
		{ key: 'harrier', label: 'Harrier OSS' },
		{ key: 'voyage', label: 'Voyage' },
		{ key: 'jina', label: 'Jina' },
		{ key: 'qwen3', label: 'Qwen3' },
		{ key: 'granite', label: 'IBM Granite' },
		{ key: 'arctic embed', label: 'Arctic Embed' },
		{ key: 'perplexity embed', label: 'Perplexity Embed' },
		{ key: 'pplx', label: 'Perplexity Embed' },
		{ key: 'gte', label: 'GTE' },
		{ key: 'bge', label: 'BGE' },
		{ key: 'e5', label: 'E5' },
		{ key: 'openai text-embedding', label: 'OpenAI Embedding' },
		{ key: 'jasper', label: 'Stella' },
		{ key: 'coderankembed', label: 'Nomic Embed' },
		{ key: 'nomic embed', label: 'Nomic Embed' },
		{ key: 'cohere embed', label: 'Cohere Embed' },
		{ key: 'embeddinggemma', label: 'EmbeddingGemma' },
		{ key: 'gemini embedding', label: 'Gemini Embedding' },
		{ key: 'tarka', label: 'Tarka' },
		{ key: 'fusion', label: 'Fusion' },
		{ key: 'bm25', label: 'BM25' }
	];

	for (const rule of familyRules) {
		if (name.includes(rule.key)) return rule.label;
	}
	return 'Other';
}

/** Model family from leaderboard_data.json (`info.family`), falling back to name-based inference. */
function getModelFamily(row) {
	const family = String(row?.info?.family || '').trim();
	return family || inferModelFamily(row?.info?.name);
}

function buildFamilyColorMap(dataToRender) {
	const families = Array.from(
		new Set(
			dataToRender
				.map(row => getModelFamily(row))
				.filter(Boolean)
		)
	).sort((a, b) => a.localeCompare(b));

	const colorMap = {};
	let fallbackIndex = 0;
	families.forEach((family, idx) => {
		if (PINNED_FAMILY_COLORS[family]) {
			colorMap[family] = PINNED_FAMILY_COLORS[family];
		} else {
			colorMap[family] = FAMILY_COLOR_PALETTE[fallbackIndex % FAMILY_COLOR_PALETTE.length];
			fallbackIndex += 1;
		}
	});
	return colorMap;
}

function formatParameterSize(sizeInBillions) {
	if (sizeInBillions === undefined || sizeInBillions === null || Number.isNaN(sizeInBillions)) return '-';
	if (sizeInBillions < 1) {
		const inMillions = sizeInBillions * 1000;
		return `${parseFloat(inMillions.toFixed(2))}M`;
	}
	return `${parseFloat(sizeInBillions.toFixed(3))}B`;
}

function getModelAverageMetric(data, matcher, metricKey) {
	const row = (data || []).find(item => matcher(String(item?.info?.name || '').toLowerCase()));
	const val = row?.datasets?.average?.[metricKey];
	if (val === undefined || val === null || Number.isNaN(Number(val))) return null;
	return Number(val);
}

function normalizeModelName(rawName) {
	return String(rawName || '').toLowerCase().replace(/^oracle:\s*/i, '').trim();
}

function isReferenceBaselineModel(rawName) {
	const name = normalizeModelName(rawName);
	return name === 'bm25' || name === 'fusion (bm25, bge, e5, voyage)';
}

function parseSizeToBillions(sizeStr) {
	if (sizeStr === undefined || sizeStr === null) return null;
	const raw = String(sizeStr).trim();
	if (raw === '' || raw === '-') return null;
	const m = raw.match(/^([\d.]+)\s*([BMK])$/i);
	if (!m) return null;
	const num = parseFloat(m[1]);
	if (Number.isNaN(num)) return null;
	const unit = m[2].toUpperCase();
	if (unit === 'B') return num;
	if (unit === 'M') return num / 1000;
	if (unit === 'K') return num / 1e6;
	return null;
}

function parseReleaseDate(dateStr) {
	if (!dateStr) return null;
	const d = new Date(dateStr);
	return Number.isNaN(d.getTime()) ? null : d;
}

function renderRecallPlots(dataToRender) {
	if (typeof Plotly === 'undefined') return;

	const emptyMsg = document.getElementById('recall-plots-empty');
	const hasAnyParams = dataToRender.some(row => parseSizeToBillions(row.info?.size) !== null);

	if (emptyMsg) {
		if (!hasAnyParams) {
			emptyMsg.textContent =
				'No models in the current filter have a numeric parameter count; adjust filters or refer to the table for models without a reported size.';
			emptyMsg.classList.remove('is-hidden');
		} else {
			emptyMsg.textContent = '';
			emptyMsg.classList.add('is-hidden');
		}
	}

	const plotConfig = { responsive: true, displayModeBar: true, displaylogo: false };
	const plotData = dataToRender.filter(row => !isReferenceBaselineModel(row.info?.name));
	const familyColors = buildFamilyColorMap(plotData);
	renderOmittedSizeNote(plotData);

	AVERAGE_METRIC_PLOTS.forEach(({ plotId, metricKey, yTitle, hoverMetric, yMin, yMax }) => {
		const el = document.getElementById(plotId);
		if (!el) return;

		const grouped = {};
		plotData.forEach(row => {
			const typeKey = row.info?.type;
			const x = parseSizeToBillions(row.info?.size);
			const y = row.datasets?.average?.[metricKey];
			if (x === null || y === undefined || y === null || Number.isNaN(Number(y))) return;

			const family = getModelFamily(row);
			if (!grouped[family]) {
				grouped[family] = { x: [], y: [], symbols: [], hovertext: [], labels: [], isNew: [] };
			}
			grouped[family].x.push(x);
			grouped[family].y.push(Number(y));
			const modelName = row.info?.name ?? '';
			const typeLabel = RECALL_TYPE_LABELS[typeKey] || typeKey || '';
			const paramLabel = formatParameterSize(x);
			grouped[family].hovertext.push(
				`<b>${modelName}</b>${isNewModel(row.info?.date) ? ' 🆕' : ''}<br>Family: ${family}<br>Type: ${typeLabel}<br>Parameters: ${paramLabel}`
			);
			grouped[family].symbols.push(TYPE_SYMBOLS[typeKey] || 'circle');
			const isNew = isNewModel(row.info?.date);
			grouped[family].isNew.push(isNew);
			grouped[family].labels.push(isNew ? modelName : '');
		});

		const traces = Object.keys(grouped)
			.sort((a, b) => a.localeCompare(b))
			.map(family => ({
				type: 'scatter',
				mode: 'markers',
				name: family,
				x: grouped[family].x,
				y: grouped[family].y,
				hovertext: grouped[family].hovertext,
				marker: {
					color: familyColors[family] || '#666',
					symbol: grouped[family].symbols,
					size: grouped[family].isNew.map(n => (n ? 14 : 12)),
					opacity: 0.95,
					line: {
						width: grouped[family].isNew.map(n => (n ? 2.5 : 1)),
						color: grouped[family].isNew.map(n => (n ? '#1c2340' : '#fff'))
					}
				},
				hovertemplate:
					'%{hovertext}<br>' +
					hoverMetric +
					': %{y:.3f}<extra></extra>'
			}));

		const xValues = traces.flatMap(t => t.x || []);
		const xMin = xValues.length ? Math.min(...xValues) : null;
		const xMax = xValues.length ? Math.max(...xValues) : null;
		const baselineData = fullLeaderboardData || dataToRender;
		const bm25Score = getModelAverageMetric(
			baselineData,
			name => name === 'bm25',
			metricKey
		);
		const fusionScore = getModelAverageMetric(
			baselineData,
			name => name === 'fusion (bm25, bge, e5, voyage)',
			metricKey
		);

		if (xMin !== null && xMax !== null) {
			if (bm25Score !== null) {
				traces.push({
					type: 'scatter',
					mode: 'lines',
					name: 'BM25',
					x: [xMin, xMax],
					y: [bm25Score, bm25Score],
					line: { color: 'rgba(97,97,97,0.55)', width: 1.1, dash: 'dash' },
					hovertemplate: `BM25<br>${hoverMetric}: ${bm25Score.toFixed(3)}<extra></extra>`
				});
			}
			if (fusionScore !== null) {
				traces.push({
					type: 'scatter',
					mode: 'lines',
					name: 'Fusion',
					x: [xMin, xMax],
					y: [fusionScore, fusionScore],
					line: { color: 'rgba(106,27,154,0.55)', width: 1.1, dash: 'dot' },
					hovertemplate: `Fusion<br>${hoverMetric}: ${fusionScore.toFixed(3)}<extra></extra>`
				});
			}
		}

		const totalPoints = traces.reduce((acc, t) => acc + (t.mode === 'lines' ? 0 : (t.x?.length || 0)), 0);

		if (totalPoints === 0) {
			const emptyLayout = {
				annotations: [
					{
						text: hasAnyParams
							? 'No data for this view.'
							: 'No models with numeric parameter counts.',
						xref: 'paper',
						yref: 'paper',
						x: 0.5,
						y: 0.5,
						showarrow: false,
						font: { size: 14, color: '#666' }
					}
				],
				xaxis: { visible: false },
				yaxis: { visible: false },
				margin: { t: 20, r: 20, b: 20, l: 20 }
			};
			if (el.data && el.layout) {
				Plotly.react(el, [], emptyLayout, plotConfig);
			} else {
				Plotly.newPlot(el, [], emptyLayout, plotConfig);
			}
			return;
		}

		const layout = {
			height: 430,
			margin: { t: 28, r: 12, b: 130, l: 56 },
			xaxis: {
				title: { text: 'Model Parameters (log scale)', standoff: 26 },
				type: 'log',
				tickvals: [0.025, 0.05, 0.1, 0.2, 0.5, 1, 2, 5, 10, 20, 50],
				ticktext: ['25M', '50M', '100M', '200M', '500M', '1B', '2B', '5B', '10B', '20B', '50B'],
				automargin: true,
				showgrid: true,
				zeroline: false,
				tickfont: { size: 11 }
			},
			yaxis: {
				title: { text: yTitle },
				range: [yMin, yMax],
				tickformat: '.2f',
				automargin: true,
				showgrid: true
			},
			legend: {
				orientation: 'h',
				yanchor: 'top',
				y: -0.36,
				xanchor: 'center',
				x: 0.5
			},
			hovermode: 'closest',
			dragmode: 'zoom',
			annotations: buildNewModelAnnotations(grouped, yMin, yMax, 430 - 28 - 130, x => Math.log10(x))
		};

		if (el.data && el.layout) {
			Plotly.react(el, traces, layout, plotConfig);
		} else {
			Plotly.newPlot(el, traces, layout, plotConfig);
		}
	});
}

/**
 * Labels for recently released models, drawn as annotations to the left of each point and
 * stacked vertically so neighbouring labels never overlap.
 */
function buildNewModelAnnotations(grouped, yMin, yMax, plotHeightPx, toAxisX) {
	const points = [];
	Object.values(grouped).forEach(g => {
		g.isNew.forEach((isNew, i) => {
			if (isNew) points.push({ x: g.x[i], y: g.y[i], label: g.labels[i] });
		});
	});
	points.sort((a, b) => b.y - a.y);

	const pxPerUnit = plotHeightPx / (yMax - yMin);
	const minGapPx = 20;
	let lastLabelPx = -Infinity;
	return points.map(pt => {
		const pointPx = (yMax - pt.y) * pxPerUnit;
		const labelPx = Math.max(pointPx - 14, lastLabelPx + minGapPx);
		lastLabelPx = labelPx;
		return {
			x: toAxisX(pt.x),
			y: pt.y,
			xref: 'x',
			yref: 'y',
			text: pt.label,
			showarrow: true,
			arrowhead: 0,
			arrowwidth: 1,
			arrowcolor: '#8a90a8',
			ax: -48,
			ay: labelPx - pointPx,
			xanchor: 'right',
			font: { size: 11, color: '#1c2340' },
			bgcolor: 'rgba(255,255,255,0.92)',
			bordercolor: '#d5dcfb',
			borderwidth: 1,
			borderpad: 2
		};
	});
}

/** Lists models that cannot be placed on the parameter axis because their size is undisclosed. */
function renderOmittedSizeNote(plotData) {
	const el = document.getElementById('recall-plots-omitted');
	if (!el) return;
	const omitted = plotData
		.filter(row => parseSizeToBillions(row.info?.size) === null)
		.sort((a, b) => (parseReleaseDate(b.info?.date) || 0) - (parseReleaseDate(a.info?.date) || 0));
	if (!omitted.length) {
		el.innerHTML = '';
		el.classList.add('is-hidden');
		return;
	}
	const names = omitted.map(row => `<span class="plot-omitted-chip">${escapeHtml(row.info.name)}</span>`).join('');
	el.innerHTML = `<span class="plot-omitted-label">Not shown (undisclosed size, see release-date plot):</span>${names}`;
	el.classList.remove('is-hidden');
}

function resizeRecallPlots() {
	if (typeof Plotly === 'undefined') return;
	AVERAGE_METRIC_PLOTS.forEach(({ plotId }) => {
		const el = document.getElementById(plotId);
		if (!el || el.offsetParent === null) return;
		try {
			Plotly.Plots.resize(el);
		} catch (_) {
			/* no plot yet */
		}
	});
}

function renderReleaseDatePlots(dataToRender) {
	if (typeof Plotly === 'undefined') return;

	const emptyMsg = document.getElementById('date-plots-empty');
	const hasAnyDates = dataToRender.some(row => parseReleaseDate(row.info?.date) !== null);

	if (emptyMsg) {
		if (!hasAnyDates) {
			emptyMsg.textContent =
				'No models in the current filter have a valid release date; adjust filters or refer to the table.';
			emptyMsg.classList.remove('is-hidden');
		} else {
			emptyMsg.textContent = '';
			emptyMsg.classList.add('is-hidden');
		}
	}

	const plotConfig = { responsive: true, displayModeBar: true, displaylogo: false };
	const plotData = dataToRender.filter(row => !isReferenceBaselineModel(row.info?.name));
	const familyColors = buildFamilyColorMap(plotData);

	AVERAGE_METRIC_DATE_PLOTS.forEach(({ plotId, metricKey, yTitle, hoverMetric, yMin, yMax }) => {
		const el = document.getElementById(plotId);
		if (!el) return;

		const grouped = {};
		plotData.forEach(row => {
			const typeKey = row.info?.type;
			const x = parseReleaseDate(row.info?.date);
			const y = row.datasets?.average?.[metricKey];
			if (x === null || y === undefined || y === null || Number.isNaN(Number(y))) return;

			const family = getModelFamily(row);
			if (!grouped[family]) {
				grouped[family] = { x: [], y: [], symbols: [], hovertext: [], labels: [], isNew: [] };
			}
			grouped[family].x.push(x);
			grouped[family].y.push(Number(y));
			const modelName = row.info?.name ?? '';
			const typeLabel = RECALL_TYPE_LABELS[typeKey] || typeKey || '';
			const dateLabel = row.info?.date || '-';
			grouped[family].hovertext.push(
				`<b>${modelName}</b>${isNewModel(row.info?.date) ? ' 🆕' : ''}<br>Family: ${family}<br>Type: ${typeLabel}<br>Release date: ${dateLabel}`
			);
			grouped[family].symbols.push(TYPE_SYMBOLS[typeKey] || 'circle');
			const isNew = isNewModel(row.info?.date);
			grouped[family].isNew.push(isNew);
			grouped[family].labels.push(isNew ? modelName : '');
		});

		const traces = Object.keys(grouped)
			.sort((a, b) => a.localeCompare(b))
			.map(family => ({
				type: 'scatter',
				mode: 'markers',
				name: family,
				x: grouped[family].x,
				y: grouped[family].y,
				hovertext: grouped[family].hovertext,
				marker: {
					color: familyColors[family] || '#666',
					symbol: grouped[family].symbols,
					size: grouped[family].isNew.map(n => (n ? 14 : 12)),
					opacity: 0.95,
					line: {
						width: grouped[family].isNew.map(n => (n ? 2.5 : 1)),
						color: grouped[family].isNew.map(n => (n ? '#1c2340' : '#fff'))
					}
				},
				hovertemplate:
					'%{hovertext}<br>' +
					hoverMetric +
					': %{y:.3f}<extra></extra>'
			}));

		const xValues = traces.flatMap(t => t.x || []);
		const xMin = xValues.length ? new Date(Math.min(...xValues.map(d => d.getTime()))) : null;
		const xMax = xValues.length ? new Date(Math.max(...xValues.map(d => d.getTime()))) : null;
		const xMinMonthStart = xMin ? new Date(xMin.getFullYear(), xMin.getMonth(), 1) : null;
		const baselineData = fullLeaderboardData || dataToRender;
		const bm25Score = getModelAverageMetric(
			baselineData,
			name => name === 'bm25',
			metricKey
		);
		const fusionScore = getModelAverageMetric(
			baselineData,
			name => name === 'fusion (bm25, bge, e5, voyage)',
			metricKey
		);

		if (xMin !== null && xMax !== null) {
			if (bm25Score !== null) {
				traces.push({
					type: 'scatter',
					mode: 'lines',
					name: 'BM25',
					x: [xMin, xMax],
					y: [bm25Score, bm25Score],
					line: { color: 'rgba(97,97,97,0.55)', width: 1.1, dash: 'dash' },
					hovertemplate: `BM25<br>${hoverMetric}: ${bm25Score.toFixed(3)}<extra></extra>`
				});
			}
			if (fusionScore !== null) {
				traces.push({
					type: 'scatter',
					mode: 'lines',
					name: 'Fusion',
					x: [xMin, xMax],
					y: [fusionScore, fusionScore],
					line: { color: 'rgba(106,27,154,0.55)', width: 1.1, dash: 'dot' },
					hovertemplate: `Fusion<br>${hoverMetric}: ${fusionScore.toFixed(3)}<extra></extra>`
				});
			}
		}

		const totalPoints = traces.reduce((acc, t) => acc + (t.mode === 'lines' ? 0 : (t.x?.length || 0)), 0);

		if (totalPoints === 0) {
			const emptyLayout = {
				annotations: [
					{
						text: hasAnyDates
							? 'No data for this view.'
							: 'No models with valid release dates.',
						xref: 'paper',
						yref: 'paper',
						x: 0.5,
						y: 0.5,
						showarrow: false,
						font: { size: 14, color: '#666' }
					}
				],
				xaxis: { visible: false },
				yaxis: { visible: false },
				margin: { t: 20, r: 20, b: 20, l: 20 }
			};
			if (el.data && el.layout) {
				Plotly.react(el, [], emptyLayout, plotConfig);
			} else {
				Plotly.newPlot(el, [], emptyLayout, plotConfig);
			}
			return;
		}

		const layout = {
			height: 430,
			margin: { t: 28, r: 12, b: 160, l: 56 },
			xaxis: {
				title: { text: 'Model Release Date', standoff: 34 },
				type: 'date',
				tickmode: 'linear',
				tick0: xMinMonthStart ? xMinMonthStart.toISOString().slice(0, 10) : undefined,
				dtick: 'M1',
				tickformat: '%b %Y',
				tickangle: -45,
				automargin: true,
				showgrid: true,
				zeroline: false,
				tickfont: { size: 11 }
			},
			yaxis: {
				title: { text: yTitle },
				range: [yMin, yMax],
				tickformat: '.2f',
				automargin: true,
				showgrid: true
			},
			legend: {
				orientation: 'h',
				yanchor: 'top',
				y: -0.44,
				xanchor: 'center',
				x: 0.5,
				entrywidthmode: 'pixels',
				entrywidth: 155,
				itemsizing: 'constant'
			},
			hovermode: 'closest',
			dragmode: 'zoom',
			annotations: buildNewModelAnnotations(grouped, yMin, yMax, 430 - 28 - 160, x => x.toISOString().slice(0, 10))
		};

		if (el.data && el.layout) {
			Plotly.react(el, traces, layout, plotConfig);
		} else {
			Plotly.newPlot(el, traces, layout, plotConfig);
		}
	});
}

function resizeReleaseDatePlots() {
	if (typeof Plotly === 'undefined') return;
	AVERAGE_METRIC_DATE_PLOTS.forEach(({ plotId }) => {
		const el = document.getElementById(plotId);
		if (!el || el.offsetParent === null) return;
		try {
			Plotly.Plots.resize(el);
		} catch (_) {
			/* no plot yet */
		}
	});
}

$(document).ready(function () {
	var options = {
		slidesToScroll: 1,
		slidesToShow: 1,
		loop: true,
		infinite: true,
		autoplay: true,
		autoplaySpeed: 5000,
	};
	bulmaCarousel.attach('.carousel', options);
	bulmaSlider.attach();
});

const LB_DATASETS = ['average', 'langchain', 'yolo', 'laravel', 'angular', 'godot'];
const LB_METRICS = [
	{ key: 'alpha_ndcg_10', label: 'α@10' },
	{ key: 'coverage_20', label: 'C@20' },
	{ key: 'recall_50', label: 'R@50' }
];
const LB_DEFAULT_SORT_KEY = 'average.recall_50';
const LB_DEFAULT_PAGE_SIZE = 20;

const lbState = {
	rows: [],
	styleRanks: new Map(),
	sortKey: LB_DEFAULT_SORT_KEY,
	sortDir: 'desc',
	page: 1,
	pageSize: LB_DEFAULT_PAGE_SIZE
};

document.addEventListener('DOMContentLoaded', function () {
	loadTableData();
	setupEventListeners();
	setupPageInteractions();
	window.addEventListener('resize', function () {
		resizeRecallPlots();
		resizeReleaseDatePlots();
	});
});

function isNewModel(dateStr) {
	const modelDate = new Date(dateStr);
	const now = new Date();
	const daysDiff = (now - modelDate) / (1000 * 60 * 60 * 24);
	return daysDiff <= 90;
}

function loadTableData() {
	fetch('./leaderboard_data.json', { cache: 'no-cache' })
		.then(response => {
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			return response.json();
		})
		.then(data => {
			fullLeaderboardData = data.leaderboardData;
			applyTypeFilter();
		})
		.catch(error => {
			console.error('Error loading table data:', error);
			document.querySelector('#freshstack-table tbody').innerHTML = `
        <tr>
          <td colspan="23" class="lb-error">
            Error loading data: ${error.message}<br>
            Please ensure you're accessing this page through a web server (http://localhost:8000) and not directly from the file system.
          </td>
        </tr>
      `;
		});
}

function setupEventListeners() {
	document.getElementById('reset-table').addEventListener('click', resetTable);

	document.querySelectorAll('.type-filter, .retriever-filter').forEach(cb => {
		cb.addEventListener('change', applyTypeFilter);
	});

	document.querySelectorAll('#freshstack-table thead th.sortable').forEach(header => {
		header.addEventListener('click', function () {
			const key = this.dataset.key;
			if (lbState.sortKey === key) {
				lbState.sortDir = lbState.sortDir === 'desc' ? 'asc' : 'desc';
			} else {
				lbState.sortKey = key;
				lbState.sortDir = key === 'name' ? 'asc' : 'desc';
			}
			lbState.page = 1;
			sortRows();
			renderTablePage();
		});
	});

	document.getElementById('lb-pagination').addEventListener('click', event => {
		const btn = event.target.closest('[data-page]');
		if (!btn || btn.disabled) return;
		goToPage(parseInt(btn.dataset.page, 10));
	});

	document.getElementById('lb-page-size').addEventListener('change', function () {
		lbState.pageSize = this.value === 'all' ? Infinity : parseInt(this.value, 10);
		lbState.page = 1;
		renderTablePage();
	});

	document.getElementById('download-csv').addEventListener('click', () => {
		exportTableToCSV();
	});

	document.getElementById('download-json').addEventListener('click', () => {
		exportTableToJSON();
	});
}

function getCheckedTypes() {
	return Array.from(document.querySelectorAll('.type-filter:checked')).map(cb => cb.value);
}

function getCheckedRetrievers() {
	return Array.from(document.querySelectorAll('.retriever-filter:checked')).map(cb => cb.value);
}

/** Chip counts reflect the selection in the *other* filter group. */
function updateFilterChips() {
	const data = fullLeaderboardData || [];
	const checkedTypes = getCheckedTypes();
	const checkedRetrievers = getCheckedRetrievers();
	document.querySelectorAll('.type-chip').forEach(chip => {
		const input = chip.querySelector('input');
		const isRetriever = input.classList.contains('retriever-filter');
		const count = data.filter(row => isRetriever
			? row.info.retriever === input.value && checkedTypes.includes(row.info.type)
			: row.info.type === input.value && checkedRetrievers.includes(row.info.retriever)
		).length;
		chip.classList.toggle('is-active', input.checked);
		let countEl = chip.querySelector('.chip-count');
		if (!countEl) {
			countEl = document.createElement('span');
			countEl.className = 'chip-count';
			chip.appendChild(countEl);
		}
		countEl.textContent = count;
	});
}

function applyTypeFilter() {
	if (!fullLeaderboardData) return;

	const checkedTypes = getCheckedTypes();
	const checkedRetrievers = getCheckedRetrievers();
	const filteredData = fullLeaderboardData.filter(row =>
		checkedTypes.includes(row.info.type) && checkedRetrievers.includes(row.info.retriever)
	);

	lbState.rows = filteredData.slice();
	lbState.styleRanks = computeStyleRanks(filteredData);
	lbState.page = 1;
	sortRows();
	updateFilterChips();
	renderStats();
	renderTablePage();
	renderRecallPlots(filteredData);
	renderReleaseDatePlots(filteredData);
}

function resetTable() {
	document.querySelectorAll('.type-filter, .retriever-filter').forEach(cb => {
		cb.checked = cb.defaultChecked;
	});
	lbState.sortKey = LB_DEFAULT_SORT_KEY;
	lbState.sortDir = 'desc';
	lbState.pageSize = LB_DEFAULT_PAGE_SIZE;
	document.getElementById('lb-page-size').value = String(LB_DEFAULT_PAGE_SIZE);
	applyTypeFilter();
}

function getMetricValue(row, dataset, metric) {
	const val = row.datasets?.[dataset]?.[metric];
	if (val === undefined || val === null || val === '-' || Number.isNaN(Number(val))) return null;
	return Number(val);
}

const RETRIEVER_LABELS = {
	dense: 'Dense',
	lexical: 'Lexical',
	hybrid: 'Hybrid',
	late_interaction: 'Late-In.',
	sparse: 'Sparse'
};

function getRetrieverLabel(row) {
	const key = row.info?.retriever;
	return RETRIEVER_LABELS[key] || '-';
}

function getSortValue(row, key) {
	if (key === 'name') return String(row.info?.name || '');
	if (key === 'retriever') return row.info?.retriever ? getRetrieverLabel(row) : null;
	if (key === 'size') return parseSizeToBillions(row.info?.size);
	if (key === 'date') {
		const d = parseReleaseDate(row.info?.date);
		return d ? d.getTime() : null;
	}
	const [dataset, metric] = key.split('.');
	return getMetricValue(row, dataset, metric);
}

function sortRows() {
	const { sortKey, sortDir } = lbState;
	const dir = sortDir === 'desc' ? -1 : 1;

	lbState.rows.sort((a, b) => {
		const va = getSortValue(a, sortKey);
		const vb = getSortValue(b, sortKey);
		// Missing values always go last, regardless of direction.
		if (va === null && vb !== null) return 1;
		if (vb === null && va !== null) return -1;
		let cmp = 0;
		if (va !== null && vb !== null) {
			cmp = typeof va === 'string' ? va.localeCompare(vb) : va - vb;
		}
		if (cmp === 0) return String(a.info.name).localeCompare(String(b.info.name));
		return cmp * dir;
	});

	document.querySelectorAll('#freshstack-table thead th.sortable').forEach(th => {
		th.classList.remove('asc', 'desc', 'is-sorted');
		if (th.dataset.key === sortKey) th.classList.add(sortDir, 'is-sorted');
	});
}

function getPageCount() {
	if (!Number.isFinite(lbState.pageSize)) return 1;
	return Math.max(1, Math.ceil(lbState.rows.length / lbState.pageSize));
}

function goToPage(page) {
	const pageCount = getPageCount();
	const next = Math.min(Math.max(1, page), pageCount);
	if (next === lbState.page) return;
	lbState.page = next;
	renderTablePage();
	const card = document.querySelector('.leaderboard-card');
	if (card && card.getBoundingClientRect().top < 0) {
		card.scrollIntoView({ behavior: 'smooth', block: 'start' });
	}
}

function formatScore(value) {
	return value === null ? '-' : value.toFixed(3);
}

function escapeHtml(str) {
	return String(str).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
}

function renderRankCell(rank) {
	if (rank <= 3) return `<span class="rank-badge rank-${rank}">${rank}</span>`;
	return `<span class="rank-num">${rank}</span>`;
}

function renderTablePage() {
	const tbody = document.querySelector('#freshstack-table tbody');
	const total = lbState.rows.length;
	const pageCount = getPageCount();
	if (lbState.page > pageCount) lbState.page = pageCount;

	const start = Number.isFinite(lbState.pageSize) ? (lbState.page - 1) * lbState.pageSize : 0;
	const end = Number.isFinite(lbState.pageSize) ? Math.min(start + lbState.pageSize, total) : total;
	const pageRows = lbState.rows.slice(start, end);

	if (total === 0) {
		tbody.innerHTML = `<tr><td colspan="23" class="lb-empty">No models match the selected filters.</td></tr>`;
	} else {
		tbody.innerHTML = pageRows.map((row, i) => renderRow(row, start + i + 1)).join('');
	}

	renderPagination(pageCount);
	const info = document.getElementById('lb-page-info');
	info.textContent = total === 0
		? 'No models'
		: `Showing ${start + 1}–${end} of ${total} model${total === 1 ? '' : 's'}`;
}

function renderRow(row, rank) {
	const name = escapeHtml(row.info.name);
	const badge = isNewModel(row.info.date) ? `<span class="new-model-badge">NEW</span>` : '';
	const link = row.info.link?.trim();
	const nameCell = link
		? `<a href="${escapeHtml(link)}" target="_blank" rel="noopener">${name}</a>${badge}`
		: `<span>${name}</span>${badge}`;
	const ranks = lbState.styleRanks.get(row) || {};

	let datasetCells = '';
	LB_DATASETS.forEach(dataset => {
		LB_METRICS.forEach(metric => {
			const value = getMetricValue(row, dataset, metric.key);
			const rankInCol = ranks[`${dataset}.${metric.key}`];
			const classes = [`${dataset}-details`, 'score-cell'];
			if (value !== null && rankInCol === 0) classes.push('is-best');
			if (value !== null && rankInCol === 1) classes.push('is-second');
			if (`${dataset}.${metric.key}` === lbState.sortKey) classes.push('is-sorted-col');
			datasetCells += `<td class="${classes.join(' ')}">${formatScore(value)}</td>`;
		});
	});

	return `<tr class="${escapeHtml(row.info.type)}">
      <td class="rank-cell">${renderRankCell(rank)}</td>
      <td class="name-cell">${nameCell}</td>
      <td class="meta-cell retriever-cell"><span class="retriever-tag retriever-${escapeHtml(row.info.retriever || 'unknown')}"${row.info.retriever === 'late_interaction' ? ' title="Late-interaction (LI)"' : ''}>${escapeHtml(getRetrieverLabel(row))}</span></td>
      <td class="meta-cell">${escapeHtml(row.info.size ?? '-')}</td>
      <td class="meta-cell">${escapeHtml(row.info.date ?? '-')}</td>
      ${datasetCells}
    </tr>`;
}

function renderPagination(pageCount) {
	const nav = document.getElementById('lb-pagination');
	if (pageCount <= 1) {
		nav.innerHTML = '';
		return;
	}

	const current = lbState.page;
	const pages = [];
	for (let p = 1; p <= pageCount; p++) {
		if (p === 1 || p === pageCount || Math.abs(p - current) <= 1) {
			pages.push(p);
		} else if (pages[pages.length - 1] !== '…') {
			pages.push('…');
		}
	}

	const pageButtons = pages.map(p => p === '…'
		? `<span class="lb-page-ellipsis">…</span>`
		: `<button type="button" class="lb-page-btn${p === current ? ' is-current' : ''}" data-page="${p}"${p === current ? ' aria-current="page"' : ''}>${p}</button>`
	).join('');

	nav.innerHTML = `
    <button type="button" class="lb-page-btn lb-page-nav" data-page="${current - 1}" ${current === 1 ? 'disabled' : ''} aria-label="Previous page">‹ Prev</button>
    ${pageButtons}
    <button type="button" class="lb-page-btn lb-page-nav" data-page="${current + 1}" ${current === pageCount ? 'disabled' : ''} aria-label="Next page">Next ›</button>
  `;
}

function renderStats() {
	const el = document.getElementById('lb-stats');
	if (!el || !fullLeaderboardData) return;
	const retrievers = fullLeaderboardData.filter(row => row.info.type !== 'upper_baseline');
	const best = retrievers.reduce((acc, row) => {
		const v = getMetricValue(row, 'average', 'recall_50');
		return v !== null && (acc === null || v > acc.value) ? { row, value: v } : acc;
	}, null);
	const latest = retrievers.reduce((acc, row) => {
		const d = parseReleaseDate(row.info.date);
		return d && (!acc || d > acc.date) ? { row, date: d } : acc;
	}, null);

	const items = [
		`<span class="stat-pill"><b>${retrievers.length}</b> retrievers</span>`,
		`<span class="stat-pill"><b>5</b> domains</span>`
	];
	if (best) {
		items.push(`<span class="stat-pill">🥇 Top R@50: <b>${escapeHtml(best.row.info.name)}</b> (${best.value.toFixed(3)})</span>`);
	}
	if (latest) {
		items.push(`<span class="stat-pill">🆕 Latest: <b>${escapeHtml(latest.row.info.name)}</b></span>`);
	}
	el.innerHTML = items.join('');
}

/** Per-column rank (0 = best) of each row within `data`, used for bold/underline styling. */
function computeStyleRanks(data) {
	const rankMap = new Map(data.map(row => [row, {}]));

	LB_DATASETS.forEach(dataset => {
		LB_METRICS.forEach(({ key }) => {
			const colKey = `${dataset}.${key}`;
			const values = data
				.map(row => ({ row, value: getMetricValue(row, dataset, key) }))
				.filter(item => item.value !== null)
				.sort((a, b) => b.value - a.value);

			let currentRank = 0;
			values.forEach((item, i) => {
				if (i > 0 && item.value !== values[i - 1].value) currentRank = i;
				rankMap.get(item.row)[colKey] = currentRank;
			});
		});
	});

	return rankMap;
}

function exportTableToCSV(filename = 'leaderboard.csv') {
	const metricsLabels = LB_METRICS.map(m => m.label);
	const csv = [];

	const headerRow1 = ['Rank', 'Model Name', 'Type', 'Size', 'Date'];
	LB_DATASETS.forEach(dataset => {
		headerRow1.push(dataset.toUpperCase(), '', '');
	});
	csv.push(headerRow1.join(','));

	const headerRow2 = ['-', '-', '-', '-', '-'];
	LB_DATASETS.forEach(() => {
		headerRow2.push(...metricsLabels);
	});
	csv.push(headerRow2.join(','));

	lbState.rows.forEach((row, index) => {
		const cells = [index + 1, row.info.name, getRetrieverLabel(row), row.info.size ?? '-', row.info.date ?? '-'];
		LB_DATASETS.forEach(dataset => {
			LB_METRICS.forEach(metric => {
				cells.push(formatScore(getMetricValue(row, dataset, metric.key)));
			});
		});
		csv.push(cells.map(c => `"${String(c).replace(/[\n\r]+/g, ' ').replace(/,/g, ';')}"`).join(','));
	});

	const csvContent = csv.join('\n');
	const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
	const link = document.createElement('a');
	link.href = URL.createObjectURL(blob);
	link.setAttribute('download', filename);
	document.body.appendChild(link);
	link.click();
	document.body.removeChild(link);
}

function exportTableToJSON(filename = 'leaderboard.json') {
	fetch('./leaderboard_data.json')
		.then(response => {
			if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
			return response.json();
		})
		.then(data => {
			const blob = new Blob([JSON.stringify(data, null, 2)], {
				type: 'application/json'
			});
			const link = document.createElement('a');
			link.href = URL.createObjectURL(blob);
			link.setAttribute('download', filename);
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		})
		.catch(error => {
			console.error('Error exporting JSON:', error);
			alert('Failed to export JSON. See console for details.');
		});
}

function setupPageInteractions() {
	const newsToggle = document.getElementById('news-toggle');
	const newsList = document.getElementById('news-list');
	if (newsToggle && newsList) {
		newsToggle.addEventListener('click', () => {
			const expanded = newsList.classList.toggle('is-expanded');
			newsToggle.setAttribute('aria-expanded', String(expanded));
			newsToggle.querySelector('span').textContent = expanded ? 'Show less' : 'Show older news';
			newsToggle.classList.toggle('is-expanded', expanded);
		});
	}

	document.querySelectorAll('[data-plot-tabs]').forEach(card => {
		card.querySelectorAll('.plot-tab').forEach(tab => {
			tab.addEventListener('click', () => {
				card.querySelectorAll('.plot-tab').forEach(t => t.classList.toggle('is-active', t === tab));
				card.querySelectorAll('.plot-pane').forEach(pane => {
					pane.classList.toggle('is-active', pane.id === tab.dataset.target);
				});
				const pane = document.getElementById(tab.dataset.target);
				if (pane && typeof Plotly !== 'undefined' && pane.data) {
					Plotly.Plots.resize(pane);
				}
			});
		});
	});

	const copyBtn = document.getElementById('bibtex-copy');
	const bibtex = document.getElementById('bibtex-text');
	if (copyBtn && bibtex) {
		copyBtn.addEventListener('click', () => {
			const label = copyBtn.querySelector('.bibtex-copy-label');
			navigator.clipboard.writeText(bibtex.textContent.trim()).then(
				() => { label.textContent = 'Copied!'; },
				() => { label.textContent = 'Copy failed'; }
			).finally(() => {
				setTimeout(() => { label.textContent = 'Copy'; }, 2000);
			});
		});
	}
}
