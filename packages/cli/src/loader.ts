import ora from 'ora';

export type ProgressReporter = {
  note(message: string): void;
  step<T>(
    message: string,
    task: () => Promise<T> | T,
    completedMessage?: string,
  ): Promise<T>;
};

export function createProgressReporter(
  logger: Pick<Console, 'log'> = console,
): ProgressReporter {
  const useSpinner = process.stdout.isTTY;

  return {
    note(message: string) {
      logger.log(`- ${message}`);
    },

    async step<T>(
      message: string,
      task: () => Promise<T> | T,
      completedMessage = message,
    ): Promise<T> {
      if (useSpinner) {
        const spinner = ora({
          stream: process.stderr,
          text: message,
        }).start();

        try {
          const result = await task();
          spinner.succeed(completedMessage);
          return result;
        } catch (error) {
          spinner.fail(message);
          throw error;
        }
      }

      logger.log(`- ${message}`);

      try {
        const result = await task();
        logger.log(`OK ${completedMessage}`);
        return result;
      } catch (error) {
        logger.log(`ERR ${message}`);
        throw error;
      }
    },
  };
}
