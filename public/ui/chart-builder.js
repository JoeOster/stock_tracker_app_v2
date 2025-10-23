// Portfolio Tracker V3.0.6
// public/ui/chart-builder.js

/* global Chart */ // FIX: Informs the type checker about the global Chart object.

import { state } from '../state.js';

/**
 * Generates a consistent HSL color based on a string input.
 * @param {string} str - The input string (e.g., an exchange name).
 * @param {number} [s=75] - The saturation percentage.
 * @param {number} [l=60] - The lightness percentage.
 * @returns {string} The HSL color string.
 */
export function stringToHslColor(str, s = 75, l = 60) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = hash % 360;
    return `hsl(${h}, ${s}%, ${l}%)`;
}

/**
 * Wraps text within a canvas context to fit a maximum width.
 * @param {CanvasRenderingContext2D} context - The canvas rendering context.
 * @param {string} text - The text to wrap.
 * @param {number} x - The x-coordinate to start drawing.
 * @param {number} y - The y-coordinate to start drawing.
 * @param {number} maxWidth - The maximum width of a line.
 * @param {number} lineHeight - The height of each line.
 * @returns {void}
 */
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

/**
 * The core chart creation function. It builds and configures a Chart.js line chart.
 * If there is not enough data, it displays a message on the canvas instead.
 * @param {CanvasRenderingContext2D} ctx - The canvas rendering context.
 * @param {any[]} snapshots - The array of snapshot data to plot.
 * @returns {Chart|null} A new Chart.js instance or null if rendering is not possible.
 */
export function createChart(ctx, snapshots) {
    const datasets = {};
    const labels = [...new Set(snapshots.map(s => s.snapshot_date))].sort();

    if (!snapshots || snapshots.length === 0 || labels.length < 2) {
        ctx.clearRect(0, 0, ctx.canvas.width, ctx.canvas.height);
        ctx.font = "16px " + (state.settings.font || 'Inter');
        ctx.textAlign = "center";
        const isDarkMode = state.settings.theme === 'dark' || state.settings.theme === 'contrast';
        ctx.fillStyle = isDarkMode ? 'rgba(255, 255, 255, 0.5)' : '#666';

        const message = labels.length < 2 && snapshots && snapshots.length > 0
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
                const zoomedChartCanvas = /** @type {HTMLCanvasElement} */ (document.getElementById('zoomed-chart'));
                if (!chartZoomModal || !zoomedChartCanvas) return;
                const zoomedChartCtx = zoomedChartCanvas.getContext('2d');
                if (!zoomedChartCtx) return;
                if(state.zoomedChart) state.zoomedChart.destroy();
                state.zoomedChart = new Chart(zoomedChartCtx, chart.config);
                chartZoomModal.classList.add('visible');
            }
        }
    });
}