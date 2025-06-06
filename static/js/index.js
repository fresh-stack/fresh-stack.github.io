window.HELP_IMPROVE_VIDEOJS = false;


$(document).ready(function() {
    // Check for click events on the navbar burger icon

    var options = {
			slidesToScroll: 1,
			slidesToShow: 1,
			loop: true,
			infinite: true,
			autoplay: true,
			autoplaySpeed: 5000,
    }

		// Initialize all div with carousel class
    var carousels = bulmaCarousel.attach('.carousel', options);
	
    bulmaSlider.attach();

})

document.addEventListener('DOMContentLoaded', function() {
	loadTableData();
	setupEventListeners();
	window.addEventListener('resize', adjustNameColumnWidth);
  });

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
		const tbody = document.querySelector('#freshstack-table tbody');
  
		const datasets = ['average', 'langchain', 'yolo', 'laravel', 'angular', 'godot'];
		const metrics = [
		  { key: 'alpha_ndcg_10', label: 'α@10' },
		  { key: 'coverage_20', label: 'C@20' },
		  { key: 'recall_50', label: 'R@50' }
		];
  
		// 1. Prepare styling data
		const scoresByDataset = {};
		datasets.forEach(dataset => {
		scoresByDataset[dataset] = prepareScoresForStyling(
			data.leaderboardData, dataset);
		});

		// 2. Populate rows
		data.leaderboardData.forEach((row, index) => {
		const tr = document.createElement('tr');
		tr.classList.add(row.info.type);

		const nameCell = row.info.link && row.info.link.trim() !== ''
			? `<a href="${row.info.link}" target="_blank"><b>${row.info.name}</b></a>`
			: `<b>${row.info.name}</b>`;
		const safeGet = (obj, path, defaultValue = '-') => {
			return path.split('.').reduce((acc, part) => acc && acc[part], obj) || defaultValue;
			};

		let datasetCells = '';
		datasets.forEach(dataset => {
			metrics.forEach(metric => {
			const val = row.datasets?.[dataset]?.[metric.key] ?? '-';
			const rank = scoresByDataset[dataset]?.[metric.key]?.[index] ?? -1;
			const styledValue = applyStyle(val, rank);
			const cellClass = `${dataset}-details`;

			datasetCells += `<td class="${cellClass}">${styledValue}</td>`;
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
  
function setupEventListeners() {
	document.querySelector('.reset-cell').addEventListener('click', function () {
		resetTable();
	});
	
	var headers = document.querySelectorAll('#freshstack-table thead tr:last-child th.sortable');
	headers.forEach(function (header) {
		header.addEventListener('click', function () {
		sortTable(this);
		});
	});

	document.getElementById('download-csv').addEventListener('click', function () {
		exportTableToCSV();
	});

	document.getElementById('download-json').addEventListener('click', function () {
			exportTableToJSON();
	});
	}
	  
function toggleDetails(section) {
	var sections = ['average', 'langchain', 'yolo', 'godot', 'laravel', 'angular'];
	sections.forEach(function (sec) {
		var detailCells = document.querySelectorAll('.' + sec + '-details');
		var headerCell = document.querySelector('.' + sec + '-details-cell');
		if (sec === section) {
		detailCells.forEach(cell => cell.classList.toggle('hidden'));
		headerCell.setAttribute(
			'colspan',
			headerCell.getAttribute('colspan') === '1' ? '3' : '3'
			);
		} else {
		detailCells.forEach(cell => cell.classList.add('hidden'));
		headerCell.setAttribute('colspan', '3');
		}
	});
	
	setTimeout(adjustNameColumnWidth, 0);
}
	  
function resetTable() {
	// 1. Show all detail cells
	document.querySelectorAll(
		'.average-details, .langchain-details, .yolo-details, .godot-details, .laravel-details, .angular-details'
	).forEach(function (cell) {
		cell.classList.remove('hidden');
	});

	// 2. Make sure all detail header cells span 3 columns
	document.querySelector('.average-details-cell').setAttribute('colspan', '3');
	document.querySelector('.langchain-details-cell').setAttribute('colspan', '3');
	document.querySelector('.yolo-details-cell').setAttribute('colspan', '3');
	document.querySelector('.godot-details-cell').setAttribute('colspan', '3');
	document.querySelector('.laravel-details-cell').setAttribute('colspan', '3');
	document.querySelector('.angular-details-cell').setAttribute('colspan', '3');

	// 3. Find any sortable numeric column to trigger default sort (you can customize this)
	const headerToSort = document.querySelector('#freshstack-table thead tr:last-child th[data-sort="number"]');
	if (headerToSort) {
		sortTable(headerToSort, true, false);  // sort descending by default
	}

	// 4. Adjust column widths again
	setTimeout(adjustNameColumnWidth, 0);
}
	  
function sortTable(header, forceDescending = false, maintainOrder = false) {
	var table = document.getElementById('freshstack-table');
	var tbody = table.querySelector('tbody');
	var rows = Array.from(tbody.querySelectorAll('tr'));
	var headers = Array.from(header.parentNode.children);
	var columnIndex = headers.indexOf(header);
	var sortType = header.dataset.sort;
	
	var isDescending =
		forceDescending ||
		(!header.classList.contains('asc') && !header.classList.contains('desc')) ||
		header.classList.contains('asc');
	
	if (!maintainOrder) {
		rows.sort(function (a, b) {
		var aValue = getCellValue(a, columnIndex);
		var bValue = getCellValue(b, columnIndex);
	
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
	
	headers.forEach(function (th) {
		th.classList.remove('asc', 'desc');
	});
	
	header.classList.add(isDescending ? 'desc' : 'asc');
	
	rows.forEach(function (row) {
		tbody.appendChild(row);
	});
	
	setTimeout(adjustNameColumnWidth, 0);
}
	  
function getCellValue(row, index) {
	var cells = Array.from(row.children);
	var cell = cells[index];

	const datasets = ['average','langchain', 'yolo', 'godot', 'laravel', 'angular'];

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
	var headerToSort = document.querySelector('#freshstack-table thead tr:last-child th[data-sort="number"]:not(.hidden)');
	sortTable(headerToSort, true, false);  // sort descending by default
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
		if (width > maxWidth) {
		maxWidth = width;
		}
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

		// Sort by value descending
		valuesWithIndex.sort((a, b) => b.value - a.value);

		// Assign dense ranks (ties get same rank)
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
	console.log('Applying style to', value, 'with rank', rank);
	if (rank === 0) return `<b>${value}</b>`;
	if (rank === 1) return `<span style="text-decoration: underline;">${value}</span>`;
	return value;
}

// Export table to CSV
function exportTableToCSV(filename = 'leaderboard.csv') {
	const table = document.getElementById('freshstack-table');
	const datasets = ['average', 'langchain', 'yolo', 'laravel', 'angular', 'godot'];
	const metrics = ['α@10', 'C@20', 'R@50'];

	const csv = [];

	// Row 1: Top-level headers
	const headerRow1 = ['Model Name', 'Size', 'Date'];
	datasets.forEach(dataset => {
		headerRow1.push(dataset.toUpperCase(), '', ''); // 3 columns per dataset
	});
	csv.push(headerRow1.join(','));

	// Row 2: Metric names under each dataset
	const headerRow2 = ['-', '-', '-'];
	datasets.forEach(() => {
		headerRow2.push(...metrics);
	});
	csv.push(headerRow2.join(','));

	// Data rows
	const rows = Array.from(table.querySelectorAll('tbody tr'));
	rows.forEach(row => {
		const cells = Array.from(row.querySelectorAll('td'));
		const rowData = cells.map(cell => {
			let text = cell.textContent.trim();
			text = text.replace(/[\n\r]+/g, ' ').replace(/,/g, ';');
			return `"${text}"`;
		});
		csv.push(rowData.join(','));
	});

	// Export logic
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