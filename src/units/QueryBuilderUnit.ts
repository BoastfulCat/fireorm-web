import {FirestoreError} from '@firebase/firestore';
import {
  CustomQuery,
  Entity,
  FireOrmQueryLine,
  FirestoreOperators,
  FirestoreVal,
  OrderByParams,
  PipeOperator,
  QueryBuilder,
  QueryExecutor,
  WherePropParam,
} from '@orm/types';
import {Unsubscribe} from 'firebase/firestore';
import {getPath} from 'ts-object-path';

export class QueryBuilderUnit<T extends Entity> implements QueryBuilder<T> {
  protected queries: Array<FireOrmQueryLine> = [];
  protected limitValue!: number;
  protected offsetValue!: number;
  protected orderByObj!: OrderByParams;
  protected customQueryFunction?: CustomQuery<T>;
  protected orderByFields: Set<string> = new Set();
  protected pipeOperators: PipeOperator<T>[] = [];

  public constructor(
    protected executor: QueryExecutor<T>,
  ) {
  }

  private extractWhereParam = (param: WherePropParam<T>): string => {
    if (typeof param === 'string') {
      return param;
    }

    // eslint-disable-next-line func-call-spacing
    return getPath<T, (t: T) => unknown>(param)?.join('.');
  };

  public whereEqualTo(param: WherePropParam<T>, val: FirestoreVal): this {
    this.queries.push({
      prop: this.extractWhereParam(param),
      val,
      operator: FirestoreOperators.equal,
    });

    return this;
  }

  public whereNotEqualTo(param: WherePropParam<T>, val: FirestoreVal): this {
    this.queries.push({
      prop: this.extractWhereParam(param),
      val,
      operator: FirestoreOperators.notEqual,
    });

    return this;
  }

  public whereGreaterThan(prop: WherePropParam<T>, val: FirestoreVal): this {
    this.queries.push({
      prop: this.extractWhereParam(prop),
      val,
      operator: FirestoreOperators.greaterThan,
    });

    return this;
  }

  public whereGreaterOrEqualThan(prop: WherePropParam<T>, val: FirestoreVal): this {
    this.queries.push({
      prop: this.extractWhereParam(prop),
      val,
      operator: FirestoreOperators.greaterThanEqual,
    });

    return this;
  }

  public whereLessThan(prop: WherePropParam<T>, val: FirestoreVal): this {
    this.queries.push({
      prop: this.extractWhereParam(prop),
      val,
      operator: FirestoreOperators.lessThan,
    });

    return this;
  }

  public whereLessOrEqualThan(prop: WherePropParam<T>, val: FirestoreVal): this {
    this.queries.push({
      prop: this.extractWhereParam(prop),
      val,
      operator: FirestoreOperators.lessThanEqual,
    });

    return this;
  }

  public whereArrayContains(prop: WherePropParam<T>, val: FirestoreVal): this {
    this.queries.push({
      prop: this.extractWhereParam(prop),
      val,
      operator: FirestoreOperators.arrayContains,
    });

    return this;
  }

  public whereArrayContainsAny(prop: WherePropParam<T>, val: FirestoreVal[]): this {
    if (val.length > 10) {
      throw new Error(`
        This query supports up to 10 values. You provided ${val.length}.
        For details please visit: https://firebase.google.com/docs/firestore/query-data/queries#in_not-in_and_array-contains-any
      `);
    }
    this.queries.push({
      prop: this.extractWhereParam(prop),
      val,
      operator: FirestoreOperators.arrayContainsAny,
    });

    return this;
  }

  public whereIn(prop: WherePropParam<T>, val: FirestoreVal[]): this {
    if (val.length > 10) {
      throw new Error(`
        This query supports up to 10 values. You provided ${val.length}.
        For details please visit: https://firebase.google.com/docs/firestore/query-data/queries#in_not-in_and_array-contains-any
      `);
    }
    this.queries.push({
      prop: this.extractWhereParam(prop),
      val,
      operator: FirestoreOperators.in,
    });

    return this;
  }

  public whereNotIn(prop: WherePropParam<T>, val: FirestoreVal[]): this {
    if (val.length > 10) {
      throw new Error(`
        This query supports up to 10 values. You provided ${val.length}.
        For details please visit: https://firebase.google.com/docs/firestore/query-data/queries#in_not-in_and_array-contains-any
      `);
    }

    this.queries.push({
      prop: this.extractWhereParam(prop),
      val,
      operator: FirestoreOperators.notIn,
    });

    return this;
  }

  public limit(limitVal: number): this {
    if (this.limitValue) {
      throw new Error(
        'A limit function cannot be called more than once in the same query expression',
      );
    }

    this.limitValue = limitVal;

    return this;
  }

  public offset(value: number): this {
    if (this.offsetValue) {
      throw new Error(
        'A offset function cannot be called more than once in the same query expression',
      );
    }

    this.offsetValue = value;

    return this;
  }

  public orderByAscending(prop: WherePropParam<T>): this {
    const fieldProp: string = typeof prop === 'string' ? prop : '';
    const alreadyOrderedByField = this.orderByFields.has(fieldProp);

    if (this.orderByObj && alreadyOrderedByField) {
      throw new Error(
        'An orderBy function cannot be called more than once in the same query expression',
      );
    }

    if (!alreadyOrderedByField && fieldProp) {
      this.orderByFields.add(fieldProp);
    }

    this.orderByObj = {
      fieldPath: this.extractWhereParam(prop),
      directionStr: 'asc',
    };

    return this;
  }

  public orderByDescending(prop: WherePropParam<T>): this {
    const fieldProp: string = typeof prop == 'string' ? prop : '';
    const alreadyOrderedByField = this.orderByFields.has(fieldProp);

    if (this.orderByObj && alreadyOrderedByField) {
      throw new Error(
        'An orderBy function cannot be called more than once in the same query expression',
      );
    }

    if (!alreadyOrderedByField && fieldProp) {
      this.orderByFields.add(fieldProp);
    }

    this.orderByObj = {
      fieldPath: this.extractWhereParam(prop),
      directionStr: 'desc',
    };

    return this;
  }

  public find(): Promise<T[]> {
    return this.executor.execute({
      queries: this.queries,
      limit: this.limitValue,
      offset: this.offsetValue,
      orderByObj: this.orderByObj,
      single: false,
      customQuery: this.customQueryFunction,
      pipeOperators: this.pipeOperators,
    }) as Promise<T[]>;
  }

  public findAndListen(
    next?: (items: T[]) => void,
    error?: (error: FirestoreError) => void,
  ): Unsubscribe {
    return this.executor.execute({
      queries: this.queries,
      limit: this.limitValue,
      offset: this.offsetValue,
      orderByObj: this.orderByObj,
      single: false,
      customQuery: this.customQueryFunction,
      listen: {next, error},
      pipeOperators: this.pipeOperators,
    }) as Unsubscribe;
  }

  public customQuery(func: CustomQuery<T>): this {
    if (this.customQueryFunction) {
      throw new Error('Only one custom query can be used per query expression');
    }

    this.customQueryFunction = func;

    return this;
  }

  public query(): this {
    return this;
  }

  public pipe(...operators: PipeOperator<T>[]): this {
    this.pipeOperators = operators;

    return this;
  }

  public findOne(): Promise<T | null> {
    return (this.executor.execute(
      {
        queries: this.queries,
        // limitVal: this.limitVal,
        offset: this.offsetValue,
        orderByObj: this.orderByObj,
        single: true,
        customQuery: this.customQueryFunction,
        pipeOperators: this.pipeOperators,
      },
    ) as Promise<T[]>).then((queryResult) => queryResult.length ? queryResult[0] : null);
  }

  public findOneAndListen(
    next?: (items: T[]) => void,
    error?: (error: FirestoreError) => void,
  ): Unsubscribe {
    return this.executor.execute(
      {
        queries: this.queries,
        // limitVal: this.limitVal,
        offset: this.offsetValue,
        orderByObj: this.orderByObj,
        single: true,
        customQuery: this.customQueryFunction,
        listen: {next, error},
        pipeOperators: this.pipeOperators,
      },
    ) as Unsubscribe;
  }
}
