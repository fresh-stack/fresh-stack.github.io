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

const RECALL_TYPE_ORDER = ['upper_baseline', 'open_source', 'proprietary'];
const RECALL_TYPE_LABELS = {
	upper_baseline: 'Oracle (Stack Overflow nuggets)',
	open_source: 'Open source',
	proprietary: 'Proprietary'
};
const TYPE_SYMBOLS = {
	upper_baseline: 'star',
	open_source: 'circle',
	proprietary: 'diamond'
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
	'Tarka': '#43a047',
	'Jasper': '#756bb1',
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
		{ key: 'stella', label: 'Stella' },
		{ key: 'harrier', label: 'Harrier OSS' },
		{ key: 'voyage', label: 'Voyage' },
		{ key: 'jina', label: 'Jina' },
		{ key: 'qwen3', label: 'Qwen3' },
		{ key: 'granite', label: 'IBM Granite' },
		{ key: 'arctic embed', label: 'Arctic Embed' },
		{ key: 'perplexity embed', label: 'Perplexity Embed' },
		{ key: 'gte', label: 'GTE' },
		{ key: 'bge', label: 'BGE' },
		{ key: 'e5', label: 'E5' },
		{ key: 'openai text-embedding', label: 'OpenAI Embedding' },
		{ key: 'jasper', label: 'Stella' },
		{ key: 'coderankembed', label: 'Nomic Embed' },
		{ key: 'nomic embed', label: 'Nomic Embed' },
		{ key: 'cohere embed', label: 'Cohere Embed' },
		{ key: 'embeddinggemma', label: 'EmbeddingGemma' },
		{ key: 'tarka', label: 'Tarka' },
		{ key: 'fusion', label: 'Fusion' },
		{ key: 'bm25', label: 'BM25' }
	];

	for (const rule of familyRules) {
		if (name.includes(rule.key)) return rule.label;
	}
	return 'Other';
}

function buildFamilyColorMap(dataToRender) {
	const families = Array.from(
		new Set(
			dataToRender
				.map(row => inferModelFamily(row.info?.name))
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
		return `${(sizeInBillions * 1000).toFixed(0)}M`;
	}
	return `${sizeInBillions.toFixed(3)}B`;
}

function getModelAverageMetric(data, matcher, metricKey) {
	const row = (data || []).find(item => matcher(String(item?.info?.name || '').toLowerCase()));
	const val = row?.datasets?.average?.[metricKey];
	if (val === undefined || val === null || Number.isNaN(Number(val))) return null;
	return Number(val);
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
	const familyColors = buildFamilyColorMap(dataToRender);

	AVERAGE_METRIC_PLOTS.forEach(({ plotId, metricKey, yTitle, hoverMetric, yMin, yMax }) => {
		const el = document.getElementById(plotId);
		if (!el) return;

		const grouped = {};
		dataToRender.forEach(row => {
			const typeKey = row.info?.type;
			const x = parseSizeToBillions(row.info?.size);
			const y = row.datasets?.average?.[metricKey];
			if (x === null || y === undefined || y === null || Number.isNaN(Number(y))) return;

			const family = inferModelFamily(row.info?.name);
			if (!grouped[family]) {
				grouped[family] = { x: [], y: [], symbols: [], hovertext: [] };
			}
			grouped[family].x.push(x);
			grouped[family].y.push(Number(y));
			const modelName = row.info?.name ?? '';
			const typeLabel = RECALL_TYPE_LABELS[typeKey] || typeKey || '';
			const paramLabel = formatParameterSize(x);
			grouped[family].hovertext.push(
				`<b>${modelName}</b><br>Family: ${family}<br>Type: ${typeLabel}<br>Parameters: ${paramLabel}`
			);
			grouped[family].symbols.push(TYPE_SYMBOLS[typeKey] || 'circle');
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
					size: 12,
					opacity: 0.95,
					line: { width: 1, color: '#fff' }
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

		const totalPoints = traces.reduce((acc, t) => acc + (t.x?.length || 0), 0);

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
			margin: { t: 28, r: 12, b: 88, l: 56 },
			xaxis: {
				title: { text: 'Model Parameters (Billions)', standoff: 18 },
				type: 'log',
				showgrid: true,
				zeroline: false,
				tickfont: { size: 11 }
			},
			yaxis: {
				title: { text: yTitle },
				range: [yMin, yMax],
				tickformat: '.2f',
				showgrid: true
			},
			legend: {
				orientation: 'h',
				yanchor: 'top',
				y: -0.28,
				xanchor: 'center',
				x: 0.5
			},
			hovermode: 'closest',
			dragmode: 'zoom'
		};

		if (el.data && el.layout) {
			Plotly.react(el, traces, layout, plotConfig);
		} else {
			Plotly.newPlot(el, traces, layout, plotConfig);
		}
	});
}

function resizeRecallPlots() {
	if (typeof Plotly === 'undefined') return;
	AVERAGE_METRIC_PLOTS.forEach(({ plotId }) => {
		const el = document.getElementById(plotId);
		if (!el) return;
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

document.addEventListener('DOMContentLoaded', function () {
	loadTableData();
	setupEventListeners();
	window.addEventListener('resize', function () {
		adjustNameColumnWidth();
		resizeRecallPlots();
	});
});

function isNewModel(dateStr) {
	const modelDate = new Date(dateStr);
	const now = new Date();
	const daysDiff = (now - modelDate) / (1000 * 60 * 60 * 24);
	return daysDiff <= 90;
}

function loadTableData() {
	console.log('Starting to load table data...');
	fetch('./leaderboard_data.json')
		.then(response => {
			console.log('Response status:', response.status);
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}
			return response.json();
		})
		.then(data => {
			console.log('Data loaded successfully:', data);
			fullLeaderboardData = data.leaderboardData;
			const checkedTypes = Array.from(document.querySelectorAll('.type-filter:checked')).map(cb => cb.value);
			const initialData = fullLeaderboardData.filter(row => checkedTypes.includes(row.info.type));
			renderTableData(initialData);
		})
		.catch(error => {
			console.error('Error loading table data:', error);
			document.querySelector('#freshstack-table tbody').innerHTML = `
        <tr>
          <td colspan="100%">
            Error loading data: ${error.message}<br>
            Please ensure you're accessing this page through a web server (http://localhost:8000) and not directly from the file system.
          </td>
        </tr>
      `;
		});
}

function renderTableData(dataToRender) {
	const tbody = document.querySelector('#freshstack-table tbody');
	tbody.innerHTML = '';

	const datasets = ['average', 'langchain', 'yolo', 'laravel', 'angular', 'godot'];
	const metrics = [
		{ key: 'alpha_ndcg_10', label: 'α@10' },
		{ key: 'coverage_20', label: 'C@20' },
		{ key: 'recall_50', label: 'R@50' }
	];

	const scoresByDataset = {};
	datasets.forEach(dataset => {
		scoresByDataset[dataset] = prepareScoresForStyling(dataToRender, dataset);
	});

	dataToRender.forEach((row, index) => {
		const tr = document.createElement('tr');
		tr.classList.add(row.info.type);

		const nameText = row.info.name;
		const badge = isNewModel(row.info.date) ? `<span class="new-model-badge">NEW</span>` : '';
		const nameCell = row.info.link?.trim()
		  ? `<a href="${row.info.link}" target="_blank"><b>${nameText}</b>${badge}</a>`
		  : `<b>${nameText}</b>${badge}`;

		let datasetCells = '';
		datasets.forEach(dataset => {
			metrics.forEach(metric => {
				const val = row.datasets?.[dataset]?.[metric.key] ?? '-';
				const rank = scoresByDataset[dataset]?.[metric.key]?.[index] ?? -1;
				const styledValue = applyStyle(val, rank);
				datasetCells += `<td class="${dataset}-details">${styledValue}</td>`;
			});
		});

		tr.innerHTML = `
      <td class="rank-cell"></td>
      <td>${nameCell}</td>
      <td>${row.info.size}</td>
      <td>${row.info.date}</td>
      ${datasetCells}
    `;
		tbody.appendChild(tr);
	});

	setTimeout(adjustNameColumnWidth, 0);
	initializeSorting();
	renderRecallPlots(dataToRender);
}

function setupEventListeners() {
	document.querySelector('.reset-cell').addEventListener('click', resetTable);

	document.querySelectorAll('.type-filter').forEach(cb => {
		cb.addEventListener('change', applyTypeFilter);
	});

	const headers = document.querySelectorAll('#freshstack-table thead tr:last-child th.sortable');
	headers.forEach(header => {
		header.addEventListener('click', function () {
			sortTable(this);
		});
	});

	document.getElementById('download-csv').addEventListener('click', () => {
		exportTableToCSV();
	});

	document.getElementById('download-json').addEventListener('click', () => {
		exportTableToJSON();
	});
}

function applyTypeFilter() {
	if (!fullLeaderboardData) return;

	const checkedTypes = Array.from(document.querySelectorAll('.type-filter:checked')).map(cb => cb.value);
	const filteredData = fullLeaderboardData.filter(row => checkedTypes.includes(row.info.type));
	renderTableData(filteredData);
}

function toggleDetails(section) {
	const sections = ['average', 'langchain', 'yolo', 'godot', 'laravel', 'angular'];
	sections.forEach(sec => {
		const detailCells = document.querySelectorAll('.' + sec + '-details');
		const headerCell = document.querySelector('.' + sec + '-details-cell');
		if (sec === section) {
			detailCells.forEach(cell => cell.classList.toggle('hidden'));
			headerCell.setAttribute('colspan', headerCell.getAttribute('colspan') === '1' ? '3' : '3');
		} else {
			detailCells.forEach(cell => cell.classList.add('hidden'));
			headerCell.setAttribute('colspan', '3');
		}
	});

	setTimeout(adjustNameColumnWidth, 0);
}

function resetTable() {
	document.querySelectorAll(
		'.average-details, .langchain-details, .yolo-details, .godot-details, .laravel-details, .angular-details'
	).forEach(cell => cell.classList.remove('hidden'));

	['average', 'langchain', 'yolo', 'godot', 'laravel', 'angular'].forEach(section => {
		document.querySelector(`.${section}-details-cell`).setAttribute('colspan', '3');
	});

	const headerToSort = getDefaultSortHeader();
	if (headerToSort) {
		sortTable(headerToSort, true, false);
	}

	// Reset checkboxes to default (Oracle unchecked)
	document.querySelectorAll('.type-filter').forEach(cb => {
		cb.checked = cb.value !== 'upper_baseline';
	});

	// Reload with default filter applied
	const checkedTypes = Array.from(document.querySelectorAll('.type-filter:checked')).map(cb => cb.value);
	renderTableData(fullLeaderboardData.filter(row => checkedTypes.includes(row.info.type)));

	setTimeout(adjustNameColumnWidth, 0);
}

function sortTable(header, forceDescending = false, maintainOrder = false) {
	const table = document.getElementById('freshstack-table');
	const tbody = table.querySelector('tbody');
	const rows = Array.from(tbody.querySelectorAll('tr'));
	const headers = Array.from(header.parentNode.children);
	const columnIndex = headers.indexOf(header);
	const sortType = header.dataset.sort;

	const isDescending =
		forceDescending ||
		(!header.classList.contains('asc') && !header.classList.contains('desc')) ||
		header.classList.contains('asc');

	if (!maintainOrder) {
		rows.sort((a, b) => {
			const aValue = getCellValue(a, columnIndex);
			const bValue = getCellValue(b, columnIndex);

			if (aValue === '-' && bValue !== '-') return isDescending ? 1 : -1;
			if (bValue === '-' && aValue !== '-') return isDescending ? -1 : 1;

			if (sortType === 'number') {
				return isDescending ? parseFloat(bValue) - parseFloat(aValue) : parseFloat(aValue) - parseFloat(bValue);
			} else if (sortType === 'date') {
				return isDescending ? new Date(bValue) - new Date(aValue) : new Date(aValue) - new Date(bValue);
			} else {
				return isDescending ? bValue.localeCompare(aValue) : aValue.localeCompare(bValue);
			}
		});
	}

	headers.forEach(th => th.classList.remove('asc', 'desc'));
	header.classList.add(isDescending ? 'desc' : 'asc');

	rows.forEach(row => tbody.appendChild(row));
	updateRanks();
	setTimeout(adjustNameColumnWidth, 0);
}

function getCellValue(row, index) {
	const cells = Array.from(row.children);
	let cell = cells[index];

	const datasets = ['average', 'langchain', 'yolo', 'godot', 'laravel', 'angular'];

	if (cell.classList.contains('hidden')) {
		for (const dataset of datasets) {
			if (cell.classList.contains(`${dataset}-details`)) {
				cell = cells.find(
					c => c.classList.contains(`${dataset}-details`) && !c.classList.contains('hidden')
				);
				break;
			}
		}
	}

	return cell ? cell.textContent.trim() : '';
}

function getDefaultSortHeader() {
	const headers = document.querySelectorAll('#freshstack-table thead tr:last-child th.sortable');

	for (const header of headers) {
		const text = header.textContent.trim();
		if (header.classList.contains('average-details') && text === 'R@50') {
			return header;
		}
	}

	return document.querySelector('#freshstack-table thead tr:last-child th[data-sort="number"]:not(.hidden)');
}

function initializeSorting() {
	const headerToSort = getDefaultSortHeader();
	if (headerToSort) {
		sortTable(headerToSort, true, false);
	}
}

function updateRanks() {
	const tbody = document.querySelector('#freshstack-table tbody');
	if (!tbody) return;

	const rows = Array.from(tbody.querySelectorAll('tr'));
	rows.forEach((row, index) => {
		const cell = row.querySelector('.rank-cell');
		if (cell) {
			cell.textContent = index + 1;
		}
	});
}

function adjustNameColumnWidth() {
	// Column widths are controlled by CSS; no JS override needed.
}

function prepareScoresForStyling(data, section) {
	const scores = {};
	const fields = ['alpha_ndcg_10', 'coverage_20', 'recall_50'];

	fields.forEach(field => {
		const valuesWithIndex = [];

		data.forEach((row, idx) => {
			const val = row.datasets?.[section]?.[field];
			if (val !== undefined && val !== null && val !== '-') {
				valuesWithIndex.push({ index: idx, value: parseFloat(val) });
			}
		});

		valuesWithIndex.sort((a, b) => b.value - a.value);

		const ranks = Array(data.length).fill(-1);
		let currentRank = 0;
		for (let i = 0; i < valuesWithIndex.length; i++) {
			if (i > 0 && valuesWithIndex[i].value !== valuesWithIndex[i - 1].value) {
				currentRank = i;
			}
			ranks[valuesWithIndex[i].index] = currentRank;
		}

		scores[field] = ranks;
	});

	return scores;
}

function applyStyle(value, rank) {
	if (value === undefined || value === null || value === '-') return '-';
	if (rank === 0) return `<b>${value}</b>`;
	if (rank === 1) return `<span style="text-decoration: underline;">${value}</span>`;
	return value;
}

function exportTableToCSV(filename = 'leaderboard.csv') {
	const table = document.getElementById('freshstack-table');
	const datasets = ['average', 'langchain', 'yolo', 'laravel', 'angular', 'godot'];
	const metrics = ['α@10', 'C@20', 'R@50'];

	const csv = [];

	const headerRow1 = ['Rank', 'Model Name', 'Size', 'Date'];
	datasets.forEach(dataset => {
		headerRow1.push(dataset.toUpperCase(), '', '');
	});
	csv.push(headerRow1.join(','));

	const headerRow2 = ['-', '-', '-', '-'];
	datasets.forEach(() => {
		headerRow2.push(...metrics);
	});
	csv.push(headerRow2.join(','));

	const rows = Array.from(table.querySelectorAll('tbody tr'));
	rows.forEach(row => {
		const cells = Array.from(row.querySelectorAll('td'));
		const rowData = cells.map(cell => {
			let text = cell.textContent.trim().replace(/[\n\r]+/g, ' ').replace(/,/g, ';');
			return `"${text}"`;
		});
		csv.push(rowData.join(','));
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
