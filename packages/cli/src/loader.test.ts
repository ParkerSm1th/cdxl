import ora from 'ora';
import { createProgressReporter } from './loader';

vi.mock('ora', () => ({
  default: vi.fn(),
}));

describe('createProgressReporter', () => {
  it('logs step start and completion', async () => {
    const logger = { log: vi.fn() };
    const progress = createProgressReporter(logger);

    await expect(progress.step('Sharing your session', async () => 'done')).resolves.toBe('done');
    expect(logger.log.mock.calls).toEqual([
      ['- Sharing your session'],
      ['OK Sharing your session'],
    ]);
  });

  it('logs note and failure state', async () => {
    const logger = { log: vi.fn() };
    const progress = createProgressReporter(logger);
    const error = new Error('boom');

    progress.note('Found an existing share');
    await expect(progress.step('Checking existing share', async () => Promise.reject(error))).rejects.toThrow(
      'boom',
    );
    expect(logger.log.mock.calls).toEqual([
      ['- Found an existing share'],
      ['- Checking existing share'],
      ['ERR Checking existing share'],
    ]);
  });

  it('uses ora when stdout is a tty', async () => {
    const isTTYDescriptor = Object.getOwnPropertyDescriptor(process.stdout, 'isTTY');
    const start = vi.fn();
    const succeed = vi.fn();
    const fail = vi.fn();

    vi.mocked(ora).mockImplementation(
      () =>
        ({
          fail,
          start: () => ({
            fail,
            start,
            succeed,
          }),
          succeed,
        }) as ReturnType<typeof ora>,
    );

    Object.defineProperty(process.stdout, 'isTTY', {
      configurable: true,
      value: true,
    });

    try {
      const logger = { log: vi.fn() };
      const progress = createProgressReporter(logger);
      await expect(progress.step('Uploading shared session', async () => 'done')).resolves.toBe(
        'done',
      );
      expect(ora).toHaveBeenCalledWith({
        stream: process.stderr,
        text: 'Uploading shared session',
      });
      expect(succeed).toHaveBeenCalledWith('Uploading shared session');
      expect(fail).not.toHaveBeenCalled();
      expect(logger.log).not.toHaveBeenCalled();
    } finally {
      vi.mocked(ora).mockReset();
      if (isTTYDescriptor) {
        Object.defineProperty(process.stdout, 'isTTY', isTTYDescriptor);
      }
    }
  });
});
