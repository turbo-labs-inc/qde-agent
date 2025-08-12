type NonIterableObject = Partial<Record<string, unknown>> & { [Symbol.iterator]?: never }; type Action = string;
class BaseNode<S = unknown, P extends NonIterableObject = NonIterableObject> {
  protected _params: P = {} as P; protected _successors: Map<Action, BaseNode> = new Map();
  protected async _exec(prepRes: unknown): Promise<unknown> { return await this.exec(prepRes); }
  async prep(shared: S): Promise<unknown> { return undefined; }
  async exec(prepRes: unknown): Promise<unknown> { return undefined; }
  async post(shared: S, prepRes: unknown, execRes: unknown): Promise<Action | undefined> { return undefined; }
  async _run(shared: S): Promise<Action | undefined> {
    const p = await this.prep(shared), e = await this._exec(p); return await this.post(shared, p, e);
  }
  async run(shared: S): Promise<Action | undefined> {
    if (this._successors.size > 0) console.warn("Node won't run successors. Use Flow.");
    return await this._run(shared);
  }
  setParams(params: P): this { this._params = params; return this; }
  next<T extends BaseNode>(node: T): T { this.on("default", node); return node; }
  on(action: Action, node: BaseNode): this {
    if (this._successors.has(action)) console.warn(`Overwriting successor for action '${action}'`);
    this._successors.set(action, node); return this;
  }
  getNextNode(action: Action = "default"): BaseNode | undefined {
    const nextAction = action || 'default', next = this._successors.get(nextAction)
    if (!next && this._successors.size > 0)
      console.warn(`Flow ends: '${nextAction}' not found in [${Array.from(this._successors.keys())}]`)
    return next
  }
  clone(): this {
    const clonedNode = Object.create(Object.getPrototypeOf(this)); Object.assign(clonedNode, this);
    clonedNode._params = { ...this._params }; clonedNode._successors = new Map(this._successors);
    return clonedNode;
  }
}
class Node<S = unknown, P extends NonIterableObject = NonIterableObject> extends BaseNode<S, P> {
  maxRetries: number; wait: number; currentRetry: number = 0;
  constructor(maxRetries: number = 1, wait: number = 0) {
    super(); this.maxRetries = maxRetries; this.wait = wait;
  }
  async execFallback(prepRes: unknown, error: Error): Promise<unknown> { throw error; }
  async _exec(prepRes: unknown): Promise<unknown> {
    for (this.currentRetry = 0; this.currentRetry < this.maxRetries; this.currentRetry++) {
      try { return await this.exec(prepRes); } 
      catch (e) {
        if (this.currentRetry === this.maxRetries - 1) return await this.execFallback(prepRes, e as Error);
        if (this.wait > 0) await new Promise(resolve => setTimeout(resolve, this.wait * 1000));
      }
    }
    return undefined;
  }
}
class BatchNode<S = unknown, P extends NonIterableObject = NonIterableObject> extends Node<S, P> {
  async _exec(items: unknown[]): Promise<unknown[]> {
    if (!items || !Array.isArray(items)) return [];
    const results = []; for (const item of items) results.push(await super._exec(item)); return results;
  }
}
class ParallelBatchNode<S = unknown, P extends NonIterableObject = NonIterableObject> extends Node<S, P> {
  async _exec(items: unknown[]): Promise<unknown[]> {
    if (!items || !Array.isArray(items)) return []
    return Promise.all(items.map((item) => super._exec(item)))
  }
}
class Flow<S = unknown, P extends NonIterableObject = NonIterableObject> extends BaseNode<S, P> {
  start: BaseNode;
  constructor(start: BaseNode) { super(); this.start = start; }
  protected async _orchestrate(shared: S, params?: P): Promise<void> {
    let current: BaseNode | undefined = this.start.clone();
    const p = params || this._params;
    while (current) {
      current.setParams(p); const action = await current._run(shared);
      current = current.getNextNode(action); current = current?.clone();
    }
  }
  async _run(shared: S): Promise<Action | undefined> {
    const pr = await this.prep(shared); await this._orchestrate(shared);
    return await this.post(shared, pr, undefined);
  }
  async exec(prepRes: unknown): Promise<unknown> { throw new Error("Flow can't exec."); }
}
class BatchFlow<S = unknown, P extends NonIterableObject = NonIterableObject, NP extends NonIterableObject[] = NonIterableObject[]> extends Flow<S, P> {
  async _run(shared: S): Promise<Action | undefined> {
    const batchParams = await this.prep(shared);
    for (const bp of batchParams) {
      const mergedParams = { ...this._params, ...bp };
      await this._orchestrate(shared, mergedParams);
    }
    return await this.post(shared, batchParams, undefined);
  }
  async prep(shared: S): Promise<NP> { const empty: readonly NonIterableObject[] = []; return empty as NP; }
}
class ParallelBatchFlow<S = unknown, P extends NonIterableObject = NonIterableObject, NP extends NonIterableObject[] = NonIterableObject[]> extends BatchFlow<S, P, NP> {
  async _run(shared: S): Promise<Action | undefined> {
    const batchParams = await this.prep(shared);
    await Promise.all(batchParams.map(bp => {
      const mergedParams = { ...this._params, ...bp };
      return this._orchestrate(shared, mergedParams);
    }));
    return await this.post(shared, batchParams, undefined);
  }
}
export { BaseNode, Node, BatchNode, ParallelBatchNode, Flow, BatchFlow, ParallelBatchFlow };