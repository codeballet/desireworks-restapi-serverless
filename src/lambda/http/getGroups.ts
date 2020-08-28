import { APIGatewayProxyHandler, APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import 'source-map-support/register';
import * as AWS from 'aws-sdk';

const docClient = new AWS.DynamoDB.DocumentClient();

const groupsTable = process.env.GROUPS_TABLE;

export const handler: APIGatewayProxyHandler = async (event: APIGatewayProxyEvent): Promise<APIGatewayProxyResult> => {
    console.log(`Processing event: ${event}`);

    let nextKey; // next key to continue scan operation
    let limit; // maximum number of elements to return

    // parse incoming query parameters
    try {
        nextKey = parseNextKeyParameter(event);
        limit = parseLimitParameter(event) || 20;
    } catch (e) {
        console.log(`Failed to parse query parameters: ${e.message}`);
        return {
            statusCode: 400,
            headers: {
                'Access-Control-Allow-Origin': '*'
            },
            body: JSON.stringify({
                error: 'Invalid parameters'
            })
        };
    }

    // scan DocumentDB table
    const result = await docClient.scan({
        TableName: groupsTable,
        Limit: limit,
        ExclusiveStartKey: nextKey
    }).promise();

    const items = result.Items;

    return {
        statusCode: 200,
        headers: {
            'Access-Control-Allow-Origin': '*'
        },
        body: JSON.stringify({
            items,
            nextKey: encodeNextKey(result.LastEvaluatedKey)
        })
    }
}

/**
 * get value of the limit parameter
 * @param {Object} event HTTP event passed to Lambda function
 * @return {number} parsed "limit" parameter
 */
function parseLimitParameter (event) {
    const limitStr = getQueryParameter(event, 'limit');
    if (!limitStr) {
        return undefined
    }
    const limit = parseInt(limitStr, 10);
    if (limit <= 0) {
        throw new Error('Limit should be positive');
    }
    return limit;
}

/**
 * get value of the nextKey parameter 
 * @param {Object} event HTTP event passed to a Lambda function
 * @return {Object} parsed "nextKey" parameter
 */
function parseNextKeyParameter(event) {
    const nextKeyStr = getQueryParameter(event, 'nextKey');
    if (!nextKeyStr) {
        return undefined;
    }
    const uriDecoded = decodeURIComponent(nextKeyStr);
    return JSON.parse(uriDecoded);
}

/**
 * get a query parameter or return "undefined"
 * @param {Object} event HTTP event passed to a Lambda function
 * @param {string} name a name of a query parameter to return
 * @returns {string} a value of a query parameter value or "undefined"
 */
function getQueryParameter(event, name) {
    const queryParams = event.queryStringParameters;
    return queryParams ? queryParams[name] : undefined;
}

/**
 * encode lastEvaluatedKey
 * @param {Object} lastEvaluatedKey a JS object representing last evaluated key
 * @return {string} URI encoded lastEvaluatedKey
 */
function encodeNextKey(lastEvaluatedKey) {
    if (!lastEvaluatedKey) {
        return null;
    }
    return encodeURIComponent(JSON.stringify(lastEvaluatedKey));
}