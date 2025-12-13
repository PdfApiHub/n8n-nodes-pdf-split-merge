import {
	IAuthenticateGeneric,
	Icon,
	ICredentialTestRequest,
	ICredentialType,
	INodeProperties,
} from 'n8n-workflow';

export class PdfmunkApi implements ICredentialType {
	name = 'pdfmunkApi';
	displayName = 'PDFMunk API';
	documentationUrl = 'https://www.pdfmunk.com/api-docs';
	icon: Icon = {
		light: 'file:../icons/pdfmunk.light.svg',
		dark: 'file:../icons/pdfmunk.dark.svg'
	};
	properties: INodeProperties[] = [
		{
			displayName: 'API Key',
			name: 'apiKey',
			type: 'string',
			typeOptions: {
				password: true,
			},
			default: '',
		},
	];

	authenticate: IAuthenticateGeneric = {
		type: 'generic',
		properties: {
			headers: {
				'CLIENT-API-KEY': '={{$credentials.apiKey}}',
			},
		},
	};

	test: ICredentialTestRequest = {
		request: {
			baseURL: 'https://pdfmunk.com',
			url: '/api/v1/pdf/merge',
			method: 'POST',
			headers: {
				'CLIENT-API-KEY': '={{$credentials.apiKey}}',
				'Content-Type': 'application/json',
			},
			body: {
				urls: ['https://example.com/a.pdf', 'https://example.com/b.pdf'],
			},
		},
	};
}


