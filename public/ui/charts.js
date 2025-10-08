import { getTradingDays, getCurrentESTDateString } from './helpers.js';

// This helper function generates a consistent color from any string
function stringToHslColor(str, s = 75, l = 60) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = hash % 360;
    return `hsl(${h}, ${s}%, ${l}%)`;
}

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
    
    // --- THIS IS THE NEW THEME-AWARE LOGIC ---
    const isDarkMode = state.settings.darkMode;
    const gridColor = isDarkMode ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)';
    const textColor = isDarkMode ? 'rgba(255, 255, 255, 0.7)' : '#666';

    const exchangeNames = [...new Set(snapshots.map(s => s.exchange))];
    
    exchangeNames.forEach(exchangeName => {
        datasets[exchangeName] = {
            label: exchangeName,
            data: [],
            fill: false,
            borderColor: stringToHslColor(exchangeName),
            tension: 0.1
        };

        const valueMap = new Map(
            snapshots
                .filter(s => s.exchange === exchangeName)
                .map(s => [s.snapshot_date, s.value])
        );

        datasets[exchangeName].data = labels.map(label => valueMap.get(label) ?? null);
    });

    return new Chart(ctx, {
        type: 'line',
        data: { labels: labels, datasets: Object.values(datasets) },
        options: {
            spanGaps: true,
            responsive: true, maintainAspectRatio: false,
            scales: {
                y: {
                    ticks: { color: textColor },
                    grid: { color: gridColor }
                },
                x: {
                    ticks: { color: textColor },
                    grid: { color: gridColor }
                }
            },
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: textColor
                    }
                }
            },
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

