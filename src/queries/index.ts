export class SqlQueries {
  GetFunctions: string;
  GetAllFunctions: string;

  public format(stringValue: string, ...formatParams: any[]): string {
    return stringValue.replace(/{(\d+)}/g, (match: string, number: string): string => {
      let num = parseInt(number);
      if (typeof formatParams[num] === 'undefined') {
        throw new Error(`Index ${number} not found in the argument list`);
      }
      if (formatParams[num] === null) return '';
      return formatParams[num].toString();
    });
  }
}

let queries = {
  0: <SqlQueries> {
    GetFunctions:
      `SELECT n.nspname as "schema",
        p.proname as "name",
        d.description,
        pg_catalog.pg_get_function_result(p.oid) as "result_type",
        pg_catalog.pg_get_function_arguments(p.oid) as "argument_types",
      CASE
        WHEN p.proisagg THEN 'agg'
        WHEN p.proiswindow THEN 'window'
        WHEN p.prorettype = 'pg_catalog.trigger'::pg_catalog.regtype THEN 'trigger'
        ELSE 'normal'
      END as "type"
      FROM pg_catalog.pg_proc p
          LEFT JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
          LEFT JOIN pg_catalog.pg_description d ON p.oid = d.objoid
      WHERE n.nspname = $1
        AND p.prorettype <> 'pg_catalog.trigger'::pg_catalog.regtype
        AND has_schema_privilege(quote_ident(n.nspname), 'USAGE') = true
        AND has_function_privilege(p.oid, 'execute') = true
      ORDER BY 1, 2, 4;`,
    GetAllFunctions:
      `SELECT n.nspname as "schema",
        p.proname as "name",
        d.description,
        pg_catalog.pg_get_function_result(p.oid) as "result_type",
        pg_catalog.pg_get_function_arguments(p.oid) as "argument_types",
      CASE
        WHEN p.proisagg THEN 'agg'
        WHEN p.proiswindow THEN 'window'
        WHEN p.prorettype = 'pg_catalog.trigger'::pg_catalog.regtype THEN 'trigger'
        ELSE 'normal'
      END as "type"
      FROM pg_catalog.pg_proc p
          LEFT JOIN pg_catalog.pg_namespace n ON n.oid = p.pronamespace
          LEFT JOIN pg_catalog.pg_description d ON p.oid = d.objoid
      WHERE n.nspname <> 'information_schema'
        AND pg_catalog.pg_function_is_visible(p.oid)
        AND p.prorettype <> 'pg_catalog.trigger'::pg_catalog.regtype
        AND has_schema_privilege(quote_ident(n.nspname), 'USAGE') = true
        AND has_function_privilege(p.oid, 'execute') = true
      ORDER BY 1, 2, 4;`
  }
}

export class SqlQueryManager {

  static getVersionQueries(versionNumber: number): SqlQueries {
    let versionKeys = Object.keys(queries).map(k => parseInt(k));
    versionKeys.sort((a, b) => a - b);

    let queryResult = new SqlQueries();
    for (let version of versionKeys) {
      if (version > versionNumber)
        break;
      
      let queryKeys = Object.keys(queries[version]);
      for (let queryKey of queryKeys) {
        if (queries[version][queryKey]) {
          queryResult[queryKey] = queries[version][queryKey];
        }
      }
    }
    return queryResult;
  }

}