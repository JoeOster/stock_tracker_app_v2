// public/ui/charts.js
import { getTradingDays, getCurrentESTDateString } from './helpers.js';

export function renderAllTimeChart(ctx, chartInstance, snapshots, state) {
    if(chartInstance) chartInstance.destroy();
    if (!ctx) return null;
    return createChart(ctx, snapshots, state);
}

export function renderFiveDayChart(ctx, chartInstance, snapshots, state) {
    if(chartInstance) chartInstance.destroy();
    if (!ctx) return null;
    const fiveTradingDays = getTradingDays(5);
    if(fiveTradingDays.length === 0) return createChart(ctx, [], state);
    const startDate = fiveTradingDays[0];
    const endDate = getCurrentESTDateString();
    const filteredSnapshots = snapshots.filter(s => s.snapshot_date >= startDate && s.snapshot_date <= endDate);
    return createChart(ctx, filteredSnapshots, state);
}

export function renderDateRangeChart(ctx, startDateEl, endDateEl, chartInstance, snapshots, state) {
    if(chartInstance) chartInstance.destroy();
    if (!ctx) return null;
    const start = startDateEl.value, end = endDateEl.value;
    let filteredSnapshots = snapshots;
    if (start && end) { filteredSnapshots = snapshots.filter(s => s.snapshot_date >= start && s.snapshot_date <= end); }
    return createChart(ctx, filteredSnapshots, state);
}

export function createChart(ctx, snapshots, state) {
    const datasets = {};
    const labels = [...new Set(snapshots.map(s => s.snapshot_date))].sort();
    
    if (labels.length < 2) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.font = "16px Arial";
        ctx.textAlign = "center";
        ctx.fillText("At least two snapshots are needed to draw a chart.", ctx.canvas.width / 2, 50);
        return null;
    }
    
    const colors = ['#3498db', '#e74c3c', '#2ecc71', '#f1c40f', '#9b59b6', '#34495e', '#1abc9c'];
    let colorIndex = 0;

    snapshots.forEach(s => {
        if (!datasets[s.exchange]) {
            datasets[s.exchange] = { 
                label: s.exchange, data: [], fill: false, 
                borderColor: colors[colorIndex++ % colors.length], tension: 0.1 
            };
        }
    });

    for (const ex in datasets) {
        datasets[ex].data = labels.map(l => snapshots.find(s => s.snapshot_date === l && s.exchange === ex)?.value ?? null);
    }

    return new Chart(ctx, {
        type: 'line',
        data: { labels: labels, datasets: Object.values(datasets) },
        options: {
            spanGaps: true, responsive: true, maintainAspectRatio: false,
            scales: { y: { ticks: { callback: function(value) { return '$' + value.toLocaleString(); } } } },

            // --- THIS SECTION IS ADDED ---
            plugins: {
                legend: {
                    position: 'bottom', // This moves the legend to the bottom
                }
            },
            // --- END OF ADDED SECTION ---

            onClick: (e, elements, chart) => {
                const chartZoomModal = document.getElementById('chart-zoom-modal');
                const zoomedChartCtx = document.getElementById('zoomed-chart').getContext('2d');
                if (!chartZoomModal || !zoomedChartCtx) return;
                if(state.zoomedChart) state.zoomedChart.destroy();
                state.zoomedChart = new Chart(zoomedChartCtx, chart.config);
                chartZoomModal.classList.add('visible');
            }
        }
    });
}