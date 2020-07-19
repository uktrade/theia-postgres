export interface IConnectionConfig {
  readonly label: string;
  readonly host: string;
  readonly user: string;
  readonly password: string;
  readonly port: number;
  readonly database: string;
  readonly ssl: boolean | object;
}
