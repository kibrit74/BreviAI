import {
    WIDGET_MODE_ROUTINE_PRESETS,
    createButtonsFromModeRoutinePreset,
    getButtonCountForSize,
} from '../../src/types/widget';

describe('Widget mode/routine preset helpers', () => {
    test('creates expected number of buttons for each size', () => {
        expect(createButtonsFromModeRoutinePreset('focus', '2x2')).toHaveLength(4);
        expect(createButtonsFromModeRoutinePreset('focus', '2x3')).toHaveLength(6);
        expect(createButtonsFromModeRoutinePreset('focus', '4x2')).toHaveLength(8);
    });

    test('preserves configured system action payloads', () => {
        const focusButtons = createButtonsFromModeRoutinePreset('focus', '2x3');
        const firstButton = focusButtons[0];

        expect(firstButton.label).toBe(WIDGET_MODE_ROUTINE_PRESETS.focus.buttons[0].label);
        expect(firstButton.action?.type).toBe('system');
        expect(firstButton.action?.payload?.action).toBe('quick_mode');
        expect(firstButton.action?.payload?.mode).toBe('focus');
    });

    test('fills missing trailing slots with defaults when size grows', () => {
        const driveButtons = createButtonsFromModeRoutinePreset('drive', '4x2');
        const expectedCount = getButtonCountForSize('4x2');

        expect(driveButtons).toHaveLength(expectedCount);
        expect(driveButtons[6].label).toBe('Ekle');
        expect(driveButtons[7].label).toBe('Ekle');
    });
});
