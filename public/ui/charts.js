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

// In public/ui/charts.js
export function renderDateRangeChart(ctx, startDateEl, endDateEl, chartInstance, snapshots, state) {
    if(chartInstance) chartInstance.destroy();
    if (!ctx) return null;
    
    const start = startDateEl ? startDateEl.value : null;
    const end = endDateEl ? endDateEl.value : null;
    
    // --- TEMPORARY DIAGNOSTIC LOGS ---
    console.log("--- Debugging Date Range Chart ---");
    console.log("Start Date Input:", start);
    console.log("End Date Input:", end);
    console.log("Available Snapshots:", snapshots);
    // --- END OF LOGS ---

    let filteredSnapshots = [];
    if (start && end) {
        filteredSnapshots = snapshots.filter(s => s.snapshot_date >= start && s.snapshot_date <= end);
    }
    
    console.log("Filtered Snapshots (this should not be empty):", filteredSnapshots);
    console.log("------------------------------------");

    return createChart(ctx, filteredSnapshots, state);
}


// This is the new helper function for word wrapping
function wrapText(context, text, x, y, maxWidth, lineHeight) {
    const words = text.split(' ');
    let line = '';
    for (let n = 0; n < words.length; n++) {
        const testLine = line + words[n] + ' ';
        const metrics = context.measureText(testLine);
        const testWidth = metrics.width;
        if (testWidth > maxWidth && n > 0) {
            context.fillText(line, x, y);
            line = words[n] + ' ';
            y += lineHeight;
        } else {
            line = testLine;
        }
    }
    context.fillText(line, x, y);
}

export function createChart(ctx, snapshots, state) {
    const datasets = {};
    const labels = [...new Set(snapshots.map(s => s.snapshot_date))].sort();
    
    // --- THIS LOGIC IS UPDATED TO USE THE WRAPPER ---
    if (snapshots.length === 0) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.font = "16px Arial";
        ctx.textAlign = "center";
        const isDarkMode = state.settings.theme === 'dark' || state.settings.theme === 'contrast';
        ctx.fillStyle = isDarkMode ? 'rgba(255, 255, 255, 0.5)' : '#666';
        
        const message = "No snapshot data available for this account holder, please add data via the Snapshots tab.";
        wrapText(ctx, message, ctx.canvas.width / 2, 50, ctx.canvas.width - 40, 20); // Using the wrapper
        return null;
        
    } else if (labels.length < 2) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.font = "16px Arial";
        ctx.textAlign = "center";
        const isDarkMode = state.settings.theme === 'dark' || state.settings.theme === 'contrast';
        ctx.fillStyle = isDarkMode ? 'rgba(255, 255, 255, 0.5)' : '#666';

        const message = "At least two snapshots are needed to draw a chart.";
        wrapText(ctx, message, ctx.canvas.width / 2, 50, ctx.canvas.width - 40, 20); // Using the wrapper
        return null;
    }
    // --- END OF UPDATED LOGIC ---
    
    const isDarkMode = state.settings.theme === 'dark' || state.settings.theme === 'contrast';
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

