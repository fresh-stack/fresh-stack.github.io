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
		tbody.innerHTML = ''; // Clear existing rows if any
  
		const datasets = ['langchain', 'yolo', 'laravel', 'angular', 'godot'];
		const metrics = [
		  { key: 'alpha_ndcg_10', label: 'α-nDCG@10' },
		  { key: 'coverage_20', label: 'Coverage@20' },
		  { key: 'recall_50', label: 'Recall@50' }
		];
  
		// 1. Prepare styling data
		const scoresByDataset = {};
		datasets.forEach(dataset => {
		scoresByDataset[dataset] = prepareScoresForStyling(
			data.leaderboardData.map(row => row.datasets?.[dataset] || {}),
			dataset
		);
		});

		// 2. Populate rows
		data.leaderboardData.forEach((row, rowIndex) => {
		const tr = document.createElement('tr');
		tr.classList.add(row.info.type || 'default');

		const nameCell = row.info.link && row.info.link.trim() !== ''
			? `<a href="${row.info.link}" target="_blank"><b>${row.info.name}</b></a>`
			: `<b>${row.info.name}</b>`;

		let datasetCells = '';
		datasets.forEach(dataset => {
			metrics.forEach(metric => {
			const val = row.datasets?.[dataset]?.[metric.key] ?? '-';
			const rank = scoresByDataset[dataset]?.[metric.key]?.[rowIndex] ?? -1;

			let style = '';
			if (rank === 0) style = 'font-weight:bold;';
			else if (rank === 1) style = 'text-decoration:underline;';

			datasetCells += `<td style="${style}">${val}</td>`;
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
	  
		document.querySelector('.langchain-details-cell').addEventListener('click', function () {
		  toggleDetails('langchain');
		});
		document.querySelector('.yolo-details-cell').addEventListener('click', function () {
		  toggleDetails('yolo');
		});
		document.querySelector('.godot-details-cell').addEventListener('click', function () {
		  toggleDetails('godot');
		});
		document.querySelector('.laravel-details-cell').addEventListener('click', function () {
		  toggleDetails('laravel');
		});
		document.querySelector('.angular-details-cell').addEventListener('click', function () {
		  toggleDetails('angular');
		});
	  
		var headers = document.querySelectorAll('#freshstack-table thead tr:last-child th.sortable');
		headers.forEach(function (header) {
		  header.addEventListener('click', function () {
			sortTable(this);
		  });
		});
	  }
	  
	  function toggleDetails(section) {
		var sections = ['langchain', 'yolo', 'godot', 'laravel', 'angular'];
		sections.forEach(function (sec) {
		  var detailCells = document.querySelectorAll('.' + sec + '-details');
		  var headerCell = document.querySelector('.' + sec + '-details-cell');
		  if (sec === section) {
			detailCells.forEach(cell => cell.classList.toggle('hidden'));
			headerCell.setAttribute('colspan', headerCell.getAttribute('colspan') === '1' ? '7' : '1');
		  } else {
			detailCells.forEach(cell => cell.classList.add('hidden'));
			headerCell.setAttribute('colspan', '1');
		  }
		});
	  
		setTimeout(adjustNameColumnWidth, 0);
	  }
	  
	  function resetTable() {
		document.querySelectorAll(
		  '.langchain-details, .yolo-details, .godot-details, .laravel-details, .angular-details'
		).forEach(function (cell) {
		  cell.classList.add('hidden');
		});
	  
		document.querySelector('.langchain-details-cell').setAttribute('colspan', '1');
		document.querySelector('.yolo-details-cell').setAttribute('colspan', '1');
		document.querySelector('.godot-details-cell').setAttribute('colspan', '1');
		document.querySelector('.laravel-details-cell').setAttribute('colspan', '1');
		document.querySelector('.angular-details-cell').setAttribute('colspan', '1');
	  
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
	  
		const datasets = ['langchain', 'yolo', 'godot', 'laravel', 'angular'];
	  
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
		// No default sort column without overall — user can manually click a header
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
		const fields = [
		  'alpha_ndcg_10',
		  'coverage_20',
		  'recall_50'
		];
	  
		fields.forEach(field => {
		  const values = data.map(row => row[section] && row[section][field])
			.filter(value => value !== '-' && value !== undefined && value !== null)
			.map(parseFloat);
	  
		  if (values.length > 0) {
			const sortedValues = [...new Set(values)].sort((a, b) => b - a);
			scores[field] = data.map(row => {
			  const value = row[section] && row[section][field];
			  if (value === '-' || value === undefined || value === null) {
				return -1;
			  }
			  return sortedValues.indexOf(parseFloat(value));
			});
		  } else {
			scores[field] = data.map(() => -1);
		  }
		});
	  
		return scores;
	  }
	  