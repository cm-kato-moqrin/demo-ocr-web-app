import { APIGatewayProxyEventV2 } from 'aws-lambda';
import { TextractClient, AnalyzeDocumentCommand } from '@aws-sdk/client-textract';

const textractClient = new TextractClient({});

interface RequestBody {
    key: string;
    bucket: string;
}

export const handler = async (event: APIGatewayProxyEventV2) => {
    if (!event.body) {
        return {
            statusCode: 400,
            headers: {
                'Access-Control-Allow-Headers': 'Content-Type',
            },
            body: JSON.stringify({ error: 'Request body is required' })
        };
    }

    const { key, bucket } = JSON.parse(event.body) as RequestBody;

    if (!(bucket && key)) {
        return {
            statusCode: 400,
            headers: {
                'Access-Control-Allow-Headers': 'Content-Type',
            },
            body: JSON.stringify({ error: 'S3 Object key is required' })
        };
    }

    console.log(`Processing file: ${bucket}/${key}`);

    const command = new AnalyzeDocumentCommand({
        Document: {
            S3Object: {
                Bucket: bucket,
                Name: key,
            },
        },
        FeatureTypes: ['QUERIES'],
        QueriesConfig: {
            Queries: [
                { Text: 'What is the Gross Pay for this period?' },
                { Text: 'What is the Net Pay?' },
            ],
        },
    });

    console.log('Sending command to Textract...');

    try {
        const response = await textractClient.send(command);
        const results = response.Blocks?.filter(block =>
            block.BlockType === 'QUERY_RESULT'
        );
        console.log('Filtered results:', JSON.stringify(results, null, 2));
        return {
            statusCode: 200,
            headers: {
                'Access-Control-Allow-Headers': 'Content-Type',
            },
            body: JSON.stringify(results)
        };
    }
    catch (error: unknown) {
        const err = error as Error;
        console.error('Error in handler:', err);
        return {
            statusCode: 500,
            headers: {
                'Access-Control-Allow-Headers': 'Content-Type',
            },
            body: JSON.stringify({
                error: 'Failed to process document',
                message: err.message
            })
        };
    }
};