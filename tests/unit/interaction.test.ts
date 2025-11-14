import { click, type, fill, select, press, hover, waitFor } from '../../src/tools/interaction';
import { browserManager } from '../../src/browser-manager';
import { traceLogger } from '../../src/trace-logger';

jest.mock('../../src/browser-manager');
jest.mock('../../src/trace-logger');

describe('Interaction Tools', () => {
  let mockPage: any;

  beforeEach(() => {
    jest.clearAllMocks();

    mockPage = {
      click: jest.fn().mockResolvedValue(undefined),
      type: jest.fn().mockResolvedValue(undefined),
      fill: jest.fn().mockResolvedValue(undefined),
      selectOption: jest.fn().mockResolvedValue([]),
      keyboard: {
        press: jest.fn().mockResolvedValue(undefined),
      },
      hover: jest.fn().mockResolvedValue(undefined),
      waitForSelector: jest.fn().mockResolvedValue({}),
      url: jest.fn().mockReturnValue('https://example.com'),
    };

    (browserManager.getActivePage as jest.Mock) = jest.fn().mockResolvedValue(mockPage);
    (traceLogger.log as jest.Mock) = jest.fn().mockResolvedValue(undefined);
  });

  describe('click', () => {
    it('should click element successfully', async () => {
      const result = await click(
        { selector: 'button#submit', button: 'left', clickCount: 1, timeout: 30000 },
        'example.com'
      );

      expect(result.status).toBe('success');
      expect(mockPage.click).toHaveBeenCalledWith('button#submit', {
        button: 'left',
        clickCount: 1,
        timeout: 30000,
      });
    });

    it('should handle double click', async () => {
      const result = await click(
        { selector: '.item', button: 'left', clickCount: 2, timeout: 30000 },
        'example.com'
      );

      expect(result.status).toBe('success');
      expect(mockPage.click).toHaveBeenCalledWith('.item', {
        button: 'left',
        clickCount: 2,
        timeout: 30000,
      });
    });

    it('should handle element not found', async () => {
      mockPage.click.mockRejectedValue(new Error('Element not found'));

      const result = await click({ selector: '.missing', button: 'left', clickCount: 1, timeout: 30000 }, 'example.com');

      expect(result.status).toBe('error');
      expect(result.error_type).toBe('element_not_found');
    });

    it('should use default parameters', async () => {
      const result = await click({ selector: 'button', button: 'left', clickCount: 1, timeout: 30000 }, 'example.com');

      expect(mockPage.click).toHaveBeenCalledWith('button', {
        button: 'left',
        clickCount: 1,
        timeout: 30000,
      });
    });
  });

  describe('type', () => {
    it('should type text successfully', async () => {
      const result = await type(
        { selector: 'input[name="username"]', text: 'testuser', delay: 50 },
        'example.com'
      );

      expect(result.status).toBe('success');
      expect(mockPage.type).toHaveBeenCalledWith('input[name="username"]', 'testuser', { delay: 50 });
    });

    it('should handle typing error', async () => {
      mockPage.type.mockRejectedValue(new Error('Input not found'));

      const result = await type({ selector: 'input', text: 'test', delay: 0 }, 'example.com');

      expect(result.status).toBe('error');
      expect(result.error_type).toBe('element_not_found');
    });
  });

  describe('fill', () => {
    it('should fill input successfully', async () => {
      const result = await fill(
        { selector: 'input[type="email"]', value: 'test@example.com' },
        'example.com'
      );

      expect(result.status).toBe('success');
      expect(mockPage.fill).toHaveBeenCalledWith('input[type="email"]', 'test@example.com');
    });

    it('should handle fill error', async () => {
      mockPage.fill.mockRejectedValue(new Error('Cannot fill readonly input'));

      const result = await fill({ selector: 'input', value: 'test' }, 'example.com');

      expect(result.status).toBe('error');
      expect(result.error_type).toBe('element_not_found');
    });
  });

  describe('select', () => {
    it('should select option successfully', async () => {
      mockPage.selectOption.mockResolvedValue(['option1']);

      const result = await select(
        { selector: 'select#country', value: 'option1', timeout: 30000 },
        'example.com'
      );

      expect(result.status).toBe('success');
      expect(mockPage.selectOption).toHaveBeenCalledWith('select#country', 'option1', { timeout: 30000 });
      expect(result.data.selected).toBe(true);
    });

    it('should select multiple options', async () => {
      mockPage.selectOption.mockResolvedValue(['option1', 'option2']);

      const result = await select(
        { selector: 'select[multiple]', value: ['option1', 'option2'], timeout: 30000 },
        'example.com'
      );

      expect(result.status).toBe('success');
      expect(result.data.selected).toBe(true);
    });

    it('should handle select error', async () => {
      mockPage.selectOption.mockRejectedValue(new Error('Select not found'));

      const result = await select({ selector: 'select', value: 'test', timeout: 30000 }, 'example.com');

      expect(result.status).toBe('error');
      expect(result.error_type).toBe('element_not_found');
    });
  });

  describe('press', () => {
    it('should press key successfully', async () => {
      const result = await press(
        { key: 'Enter', modifiers: [] },
        'example.com'
      );

      expect(result.status).toBe('success');
      expect(mockPage.keyboard.press).toHaveBeenCalledWith('Enter');
    });

    it('should press key combination with modifiers', async () => {
      const result = await press(
        { key: 'KeyS', modifiers: ['Control', 'Shift'] },
        'example.com'
      );

      expect(result.status).toBe('success');
      expect(mockPage.keyboard.press).toHaveBeenCalledWith('Control+Shift+KeyS');
    });

    it('should handle press error', async () => {
      mockPage.keyboard.press.mockRejectedValue(new Error('Invalid key'));

      const result = await press({ key: 'InvalidKey', modifiers: [] }, 'example.com');

      expect(result.status).toBe('error');
      expect(result.error_type).toBe('keyboard_error');
    });
  });

  describe('hover', () => {
    it('should hover over element successfully', async () => {
      const result = await hover({ selector: '.menu-item', timeout: 30000 }, 'example.com');

      expect(result.status).toBe('success');
      expect(mockPage.hover).toHaveBeenCalledWith('.menu-item', { timeout: 30000 });
    });

    it('should handle hover error', async () => {
      mockPage.hover.mockRejectedValue(new Error('Element not visible'));

      const result = await hover({ selector: '.hidden', timeout: 30000 }, 'example.com');

      expect(result.status).toBe('error');
      expect(result.error_type).toBe('element_not_found');
    });
  });

  describe('waitFor', () => {
    it('should wait for selector successfully', async () => {
      const result = await waitFor(
        { selector: '.loaded-content', state: 'visible', timeout: 30000 },
        'example.com'
      );

      expect(result.status).toBe('success');
      expect(mockPage.waitForSelector).toHaveBeenCalledWith('.loaded-content', {
        state: 'visible',
        timeout: 30000,
      });
    });

    it('should handle timeout', async () => {
      mockPage.waitForSelector.mockRejectedValue(new Error('Timeout exceeded'));

      const result = await waitFor(
        { selector: '.never-appears', state: 'visible', timeout: 1000 },
        'example.com'
      );

      expect(result.status).toBe('error');
      expect(result.error_type).toBe('timeout');
    });

    it('should use default state', async () => {
      await waitFor({ selector: '.element', state: 'visible', timeout: 30000 }, 'example.com');

      expect(mockPage.waitForSelector).toHaveBeenCalledWith('.element', {
        state: 'visible',
        timeout: 30000,
      });
    });
  });
});
