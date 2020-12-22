const croneJobsSymbol = Symbol("__croneJobs");

export function LimitCron(
  target: Object,
  propertyKey: string,
  descriptor: PropertyDescriptor
) {
  const originalMethod = descriptor.value;

  descriptor.value = async function (...args) {
    if (this[croneJobsSymbol] == null) {
      this[croneJobsSymbol] = new Map<Function, boolean>();
    }
    let value =
      this[croneJobsSymbol].has(originalMethod) &&
      this[croneJobsSymbol].get(originalMethod);

    if (!value) {
      try {
        this[croneJobsSymbol].set(originalMethod, true);
        return await originalMethod.apply(this, args);
      } catch (error) {
        throw error;
      } finally {
        this[croneJobsSymbol].set(originalMethod, false);
      }
    }
  };

  return descriptor;
}
