import * as AWS from "aws-sdk";
import { DriverBuilder } from "data-migration";
import NoSqlDriver from "data-migration/lib/DriverTypes/NoSQL";
import { Observable } from "rxjs";

interface DynamoDbParameters {
  region: string;
  TableName: string;
  accessKeyId?: string;
  secretAccessKey?: string;
}

const dynamoDbDriver: DriverBuilder<DynamoDbParameters> = (
  params,
  logger: (message: string) => void
): NoSqlDriver => {
  const { TableName } = params;
  const DocumentDb = new AWS.DynamoDB.DocumentClient({
    region: params.region,
    apiVersion: "2012-08-10",
    accessKeyId: params.accessKeyId,
    secretAccessKey: params.secretAccessKey,
  });

  return {
    getAllRecords<T>(): Observable<T> {
      // @ts-ignore
      return new Observable<T>(async (subscriber) => {
        const params = {
          TableName,
        } as AWS.DynamoDB.DocumentClient.ScanInput;

        let resultsRaw: AWS.DynamoDB.DocumentClient.ScanOutput;

        do {
          resultsRaw = await DocumentDb.scan(params).promise();
          logger(`Downloaded ${resultsRaw.Count} records from ${TableName}`);
          params.ExclusiveStartKey = resultsRaw.LastEvaluatedKey;

          if (resultsRaw.Items) {
            for (const item of resultsRaw.Items) {
              subscriber.next(item as T);
            }
          }
        } while (resultsRaw?.LastEvaluatedKey);

        subscriber.complete();
      });
    },
  } as NoSqlDriver;
};

export = dynamoDbDriver;