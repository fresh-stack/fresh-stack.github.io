window.HELP_IMPROVE_VIDEOJS = false;

let fullLeaderboardData = null;

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
	window.addEventListener('resize', adjustNameColumnWidth);
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
			renderTableData(fullLeaderboardData);
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
      <td>${nameCell}</td>
      <td>${row.info.size}</td>
      <td>${row.info.date}</td>
      ${datasetCells}
    `;
		tbody.appendChild(tr);
	});

	setTimeout(adjustNameColumnWidth, 0);
	initializeSorting();
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

	const headerToSort = document.querySelector('#freshstack-table thead tr:last-child th[data-sort="number"]');
	if (headerToSort) {
		sortTable(headerToSort, true, false);
	}

	// Reset all checkboxes
	document.querySelectorAll('.type-filter').forEach(cb => cb.checked = true);

	// Reload full data
	renderTableData(fullLeaderboardData);

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

function initializeSorting() {
	const headerToSort = document.querySelector('#freshstack-table thead tr:last-child th[data-sort="number"]:not(.hidden)');
	sortTable(headerToSort, true, false);
}

function adjustNameColumnWidth() {
	const nameColumn = document.querySelectorAll('#freshstack-table td:first-child, #freshstack-table th:first-child');
	let maxWidth = 0;

	const span = document.createElement('span');
	span.style.visibility = 'hidden';
	span.style.position = 'absolute';
	span.style.whiteSpace = 'nowrap';
	document.body.appendChild(span);

	nameColumn.forEach(cell => {
		span.textContent = cell.textContent;
		const width = span.offsetWidth;
		if (width > maxWidth) maxWidth = width;
	});

	document.body.removeChild(span);

	maxWidth += 20;
	nameColumn.forEach(cell => {
		cell.style.width = `${maxWidth}px`;
		cell.style.minWidth = `${maxWidth}px`;
		cell.style.maxWidth = `${maxWidth}px`;
	});
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

	const headerRow1 = ['Model Name', 'Size', 'Date'];
	datasets.forEach(dataset => {
		headerRow1.push(dataset.toUpperCase(), '', '');
	});
	csv.push(headerRow1.join(','));

	const headerRow2 = ['-', '-', '-'];
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
