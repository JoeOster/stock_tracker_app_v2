/**
 * @jest-environment jsdom
 */

// Import only the function we want to test directly
import { stringToHslColor } from './chart-builder.js';
// We won't test createChart or wrapText as they involve canvas/Chart.js mocking

describe('Chart Builder Helpers', () => {

    describe('stringToHslColor', () => {
        test('should return a valid HSL color string', () => {
            const color = stringToHslColor('Fidelity');
            expect(color).toMatch(/^hsl\(-?\d+, \d+%?, \d+%?\)$/); // Added -? to allow optional negative sign
        });

        test('should return consistent color for the same input', () => {
            const color1 = stringToHslColor('Robinhood');
            const color2 = stringToHslColor('Robinhood');
            expect(color1).toBe(color2);
        });

        test('should return different colors for different inputs', () => {
            const color1 = stringToHslColor('Fidelity');
            const color2 = stringToHslColor('E-Trade');
            expect(color1).not.toBe(color2);
        });

        test('should allow custom saturation and lightness', () => {
            const color = stringToHslColor('Test', 50, 80);
            expect(color).toMatch(/^hsl\(\d+, 50%?, 80%?\)$/); // Check if custom S/L are included
        });
    });

});