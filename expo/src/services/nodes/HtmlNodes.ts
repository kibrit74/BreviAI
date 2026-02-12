import { HtmlExtractConfig, WorkflowNode } from '../../types/workflow-types';
import * as cheerio from 'cheerio/slim';
import { VariableManager } from '../VariableManager';

export async function executeHtmlExtract(
    node: WorkflowNode,
    variableManager: VariableManager
): Promise<{ [key: string]: any }> {
    const config = node.config as HtmlExtractConfig;
    const { htmlSource, extracts } = config;

    // 1. Resolve source content
    // Use variableManager to resolve any variables in the HTML source string
    let htmlContent = variableManager.resolveString(htmlSource);


    if (!htmlContent || typeof htmlContent !== 'string') {
        throw new Error('HTML Content is empty or invalid');
    }

    // 2. Load HTML into cheerio
    const $ = cheerio.load(htmlContent);
    const result: { [key: string]: any } = {};

    // 3. Process each extraction rule
    for (const extract of extracts) {
        const { key, selector, valueType, attribute, returnArray } = extract;

        try {
            const elements = $(selector);

            if (returnArray) {
                // Return array of values
                const values = elements.map((_, el) => {
                    return extractValue($, el, valueType, attribute);
                }).get();
                result[key] = values;
            } else {
                // Return single value (first match)
                if (elements.length > 0) {
                    result[key] = extractValue($, elements[0], valueType, attribute);
                } else {
                    result[key] = null;
                }
            }
        } catch (error) {
            console.error(`Error extracting ${key} with selector ${selector}:`, error);
            result[key] = null;
        }
    }

    return result;
}

function extractValue($: cheerio.CheerioAPI, element: any, valueType: string, attribute?: string): any {
    const el = $(element);
    switch (valueType) {
        case 'text':
            return el.text().trim();
        case 'html':
            return el.html();
        case 'attr':
            return attribute ? el.attr(attribute) : null;
        case 'value':
            return el.val();
        default:
            return el.text().trim();
    }
}
