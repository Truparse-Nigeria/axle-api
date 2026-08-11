interface IJoin {
  from: string;
  localField: string;
  foreignField: string;
  as: string;
  pipeline?: any[];
  single?: boolean;
}

export interface IGroupBy {
  type: "year" | "month" | "day" | "range";
  field: string; // date field
  fromDate?: string;
  toDate?: string;
}

interface ISum {
  field: string;
  fromJoin?: string;
  toJoin?: string;
}

interface IRangeSum {
  field: string;
  fromDate: Date;
  toDate: Date;
}

export interface ISuperQuery<T> {
  filter?: Partial<Record<keyof T, any>>;
  pagination?: { currentPage: number; pageSize: number };
  search?: {
    fields: string[];
    keyword: string;
  };
  sort?: Record<string, 1 | -1>;
  joins?: IJoin[];
  groupBy?: IGroupBy;
  sumField?: ISum;
  rangeSumField?: IRangeSum;
  hiddenFields?: string[];
  fillMissing?: boolean;
  skipObjectIdConversion?: string[];
}
