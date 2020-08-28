import type { Serverless } from 'serverless/aws';

const serverlessConfiguration: Serverless = {
  service: {
    name: 'serverless-desireworks-restapi',
    // app and org for use with dashboard.serverless.com
    // app: your-app-name,
    // org: your-org-name,
  },
  frameworkVersion: '>=1.72.0',
  custom: {
    webpack: {
      webpackConfig: './webpack.config.js',
      includeModules: true
    },
    documentation: {
      api: {
        info: {
          version: 'v1.0.0',
          title: 'Desireworks restAPI',
          description: 'Serverless app for the Desireworks project'
        }
      }
    }
  },
  // list all plugins used
  plugins: [
    "serverless-webpack"
  ],
  // specify provider
  provider: {
    name: 'aws',
    runtime: 'nodejs12.x',
    apiGateway: {
      minimumCompressionSize: 1024,
    },
    stage: "${opt:stage, 'dev'}",
    region: "${opt:region, 'us-east-1'}",
    // create environment variables
    environment: {
      AWS_NODEJS_CONNECTION_REUSE_ENABLED: '1',
      GROUPS_TABLE: "Desireworks-Groups-${self:provider.stage}"
    },
    // define global permissions
    iamRoleStatements: [
      {
        Effect: 'Allow',
        Action: [
          'dynamodb:Scan',
          'dynamodb:PutItem'
        ],
        Resource: "arn:aws:dynamodb:${self:provider.region}:*:table/${self:provider.environment.GROUPS_TABLE}"
      }
    ]
  },
  functions: {
    // get all groups endpoint
    GetGroups: {
      handler: 'src/lambda/http/getGroups.handler',
      events: [
        {
          http: {
            method: 'get',
            path: 'groups',
            cors: true
          }
        }
      ]
    },
    // create a new group endpoint
    CreateGroup: {
      handler: 'src/lambda/http/createGroup.handler',
      events: [
        {
          http: {
            method: 'post',
            path: 'groups',
            cors: true,
            request: {
              // inforce a schema for the group
              schema: {
                "application/json": "${file(models/create-group-request.json)}"
              }
            }
          }
        }
      ]
    }
  },
  resources: {
    Resources: {
      // DynamoDB table for groups
      GroupsDynamoDBTable: {
        Type: 'AWS::DynamoDB::Table',
        Properties: {
          // Set 'id' as partition key
          AttributeDefinitions: [
            {
              AttributeName: 'id',
              AttributeType: 'S'
            }
          ],
          KeySchema: [
            {
              AttributeName: 'id',
              KeyType: 'HASH'
            }
          ],
          BillingMode: 'PAY_PER_REQUEST',
          TableName: "${self:provider.environment.GROUPS_TABLE}"
        }
      }
    }
  }
}

module.exports = serverlessConfiguration;
