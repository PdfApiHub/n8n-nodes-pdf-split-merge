import type {
	IExecuteFunctions,
	IDataObject,
	INodeExecutionData,
	INodeType,
	INodeTypeDescription,
} from 'n8n-workflow';
import { NodeConnectionTypes, NodeOperationError } from 'n8n-workflow';

export class PdfSplitMerge implements INodeType {
	description: INodeTypeDescription = {
		displayName: 'PDF Split and PDF Merge',
		name: 'pdfSplitMerge',
		icon: { light: 'file:../../icons/pdfhub.light.svg', dark: 'file:../../icons/pdfhub.dark.svg' },
		group: ['transform'],
		version: 1,
		description: 'Merge PDFs or split a PDF using PDF API Hub',
		defaults: {
			name: 'PDF Split and PDF Merge',
		},
		inputs: [NodeConnectionTypes.Main],
		outputs: [NodeConnectionTypes.Main],
		credentials: [
			{
				name: 'pdfapihubApi',
				required: true,
			},
		],
		usableAsTool: true,
		properties: [
			{
				displayName: 'Resource',
				name: 'resource',
				type: 'options',
				noDataExpression: true,
				options: [
					{
						name: 'PDF Utility',
						value: 'pdf',
					},
				],
				default: 'pdf',
			},
			{
				displayName: 'Operation',
				name: 'operation',
				type: 'options',
				noDataExpression: true,
				displayOptions: {
					show: {
						resource: ['pdf'],
					},
				},
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
				placeholder: 'https://pdfapihub.com/sample.pdf',
				displayOptions: {
					show: {
						resource: ['pdf'],
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
						resource: ['pdf'],
						operation: ['splitPdf'],
					},
				},
			},
			{
				displayName: 'Split Type',
				name: 'splitType',
				type: 'options',
				options: [
					{
						name: 'Specific Pages',
						value: 'pages',
						description: 'Extract specific pages',
					},
					{
						name: 'Each Page',
						value: 'each',
						description: 'Split PDF into individual pages',
					},
					{
						name: 'Chunks',
						value: 'chunks',
						description: 'Split PDF into multiple chunks',
					},
				],
				default: 'pages',
				description: 'How to split the PDF',
				displayOptions: {
					show: {
						resource: ['pdf'],
						operation: ['splitPdf'],
					},
				},
			},
			{
				displayName: 'Pages',
				name: 'pages',
				type: 'string',
				default: '',
				placeholder: '1-3,5',
				description: 'Pages to extract (e.g., "1-3,5" or comma-separated page numbers)',
				displayOptions: {
					show: {
						resource: ['pdf'],
						operation: ['splitPdf'],
						splitType: ['pages'],
					},
				},
			},
			{
				displayName: 'Number of Chunks',
				name: 'chunks',
				type: 'number',
				default: 2,
				description: 'Number of chunks to split the PDF into',
				displayOptions: {
					show: {
						resource: ['pdf'],
						operation: ['splitPdf'],
						splitType: ['chunks'],
					},
				},
			},
			{
				displayName: 'Additional Options',
				name: 'additionalOptions',
				type: 'collection',
				placeholder: 'Add Option',
				default: {},
				options: [
					{
						displayName: 'Output Format',
						name: 'output',
						type: 'options',
						options: [
							{
								name: 'URL',
								value: 'url',
								description: 'Return a URL (or URLs) to the PDF result',
							},
							{
								name: 'File/ZIP',
								value: 'file',
								description: 'Return the PDF result as a file (or ZIP for multiple)',
							},
							{
								name: 'Base64',
								value: 'base64',
								description: 'Return the PDF result as a Base64-encoded string',
							},
						],
						default: 'url',
						description: 'Choose how the API should return the result',
					},
				],
				displayOptions: {
					show: {
						resource: ['pdf'],
						operation: ['mergePdf', 'splitPdf'],
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
				const additionalOptions = this.getNodeParameter('additionalOptions', i, {}) as IDataObject;
				let body: Record<string, unknown> = {};
				const url = `https://pdfapihub.com/api/v1/pdf/${operation === 'mergePdf' ? 'merge' : 'split'}`;

				if (operation === 'mergePdf') {
					const urls = this.getNodeParameter('urls', i) as string[];
					const output = (additionalOptions.output as string) ?? 'url';
					body = { urls, output };
				} else if (operation === 'splitPdf') {
					const pdfUrl = this.getNodeParameter('url', i) as string;
					const splitType = this.getNodeParameter('splitType', i) as string;
					const output = (additionalOptions.output as string) ?? 'url';
					
					body = { url: pdfUrl, output };
					
					if (splitType === 'pages') {
						const pages = this.getNodeParameter('pages', i) as string;
						body.pages = pages;
					} else if (splitType === 'each') {
						body.mode = 'each';
					} else if (splitType === 'chunks') {
						const chunks = this.getNodeParameter('chunks', i) as number;
						body.chunks = chunks;
					}
				} else {
					throw new NodeOperationError(this.getNode(), `Unsupported operation: ${operation}`, {
						itemIndex: i,
					});
				}

				const responseData = await this.helpers.httpRequestWithAuthentication.call(
					this,
					'pdfapihubApi',
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