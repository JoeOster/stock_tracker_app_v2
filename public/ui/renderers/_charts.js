// public/ui/renderers/_charts.js
import { state } from '../../app-main.js';
import { formatQuantity, formatAccounting, getTradingDays, getCurrentESTDateString } from '../helpers.js';

// --- Chart Creation Logic (previously in charts.js) ---

function stringToHslColor(str, s = 75, l = 60) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = hash % 360;
    return `hsl(${h}, ${s}%, ${l}%)`;
}

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

function createChart(ctx, snapshots, state) {
    const datasets = {};
    const labels = [...new Set(snapshots.map(s => s.snapshot_date))].sort();
    
    if (snapshots.length === 0 || labels.length < 2) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.font = "16px " + (state.settings.font || 'Inter');
        ctx.textAlign = "center";
        const isDarkMode = state.settings.theme === 'dark' || state.settings.theme === 'contrast';
        ctx.fillStyle = isDarkMode ? 'rgba(255, 255, 255, 0.5)' : '#666';
        
        const message = labels.length < 2 && snapshots.length > 0
            ? "At least two snapshots are needed to draw a chart for this date range."
            : "No snapshot data available for this account holder in this date range.";
        wrapText(ctx, message, ctx.canvas.width / 2, 50, ctx.canvas.width - 40, 20);
        return null;
    }
    
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
        const valueMap = new Map(snapshots.filter(s => s.exchange === exchangeName).map(s => [s.snapshot_date, s.value]));
        datasets[exchangeName].data = labels.map(label => valueMap.get(label) ?? null);
    });

    return new Chart(ctx, {
        type: 'line',
        data: { labels: labels, datasets: Object.values(datasets) },
        options: {
            spanGaps: true,
            responsive: true, maintainAspectRatio: false,
            scales: {
                y: { ticks: { color: textColor }, grid: { color: gridColor } },
                x: { ticks: { color: textColor }, grid: { color: gridColor } }
            },
            plugins: {
                legend: { position: 'bottom', labels: { color: textColor } }
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

function renderAllTimeChart(ctx, chartInstance, snapshots, state) {
    if(chartInstance) chartInstance.destroy();
    if (!ctx) return null;
    return createChart(ctx, snapshots