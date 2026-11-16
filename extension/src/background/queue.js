// Sequential queue for read-modify-write data tasks, so tabs navigating at the same time do not overwrite each other.

let tail = Promise.resolve();

export function enqueue(task) {
  tail = tail.then(task).catch(console.error);
  return tail;
}
