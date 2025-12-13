import type {
	IExecuteFunctions,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

export class PdfSplitMerge implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'PDF Split & Merge',
		name: 'pdfSplitMerge',
		icon: { light: 'file:../../icons/pdfmunk.light.svg', dark: 'file:../../icons/pdfmunk.dark.svg' },
		group: ['transform'],
		version: 1,
		description: 'Merge PDFs or split a PDF using PDFMunk',
		defaults: {
			name: 'PDF Split & Merge',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'pdfmunkApi',
				required: true,
			},
		],
		usableAsTool: true,
		properties: [
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'Merge PDF',
						value: 'mergePdf',
						description: 'Merge multiple PDFs into a single PDF',
						action: 'Merge pdfs',
					},
					{
						name: 'Split PDF',
						value: 'splitPdf',
						description: 'Split a PDF into multiple files',
						action: 'Split a pdf',
					},
				],
				default: 'mergePdf',
			},

			// Merge parameters
			{
				displayName: 'URLs',
				name: 'urls',
				type: 'string',
				typeOptions: {
					multipleValues: true,
				},
				default: [],
				description: 'Array of PDF URLs to merge',
				placeholder: 'https://example.com/a.pdf',
				displayOptions: {
					show: {
						operation: ['mergePdf'],
					},
				},
			},

			// Split parameters
			{
				displayName: 'PDF URL',
				name: 'url',
				type: 'string',
				default: '',
				description: 'The PDF URL to split',
				displayOptions: {
					show: {
						operation: ['splitPdf'],
					},
				},
			},
			{
				displayName: 'Mode',
				name: 'mode',
				type: 'string',
				default: 'each',
				description:
					'Split mode as text, for example "each". Other modes are supported by the API.',
				displayOptions: {
					show: {
						operation: ['splitPdf'],
					},
				},
			},
		],
	};

	async execute(this: IExecuteFunctions): Promise<INodeExecutionData[][]> {
		const items = this.getInputData();
		const returnData: INodeExecutionData[] = [];

		for (let i = 0; i < items.length; i++) {
			try {
				const operation = this.getNodeParameter('operation', i) as string;
				let body: Record<string, unknown> = {};
				let url = '';

				if (operation === 'mergePdf') {
					const urls = this.getNodeParameter('urls', i) as string[];
					body = { urls };
					url = 'https://pdfmunk.com/api/v1/pdf/merge';
				} else if (operation === 'splitPdf') {
					const pdfUrl = this.getNodeParameter('url', i) as string;
					const mode = this.getNodeParameter('mode', i) as string;
					body = { url: pdfUrl, mode };
					url = 'https://pdfmunk.com/api/v1/pdf/split';
				} else {
					throw new NodeOperationError(this.getNode(), `Unsupported operation: ${operation}`, {
						itemIndex: i,
					});
				}

				const responseData = await this.helpers.httpRequestWithAuthentication.call(
					this,
					'pdfmunkApi',
					{
						method: 'POST',
						url,
						body,
						json: true,
					},
				);

				returnData.push({ json: responseData, pairedItem: { item: i } });
			} catch (error) {
				if (this.continueOnFail()) {
					returnData.push({ json: { error: (error as Error).message }, pairedItem: { item: i } });
				} else {
					throw new NodeOperationError(this.getNode(), error, { itemIndex: i });
				}
			}
		}

		return [returnData];
	}
}


