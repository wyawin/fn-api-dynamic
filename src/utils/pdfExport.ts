import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import type { Endpoint } from '../types/endpoint';

const loadImageAsDataURL = (src: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.drawImage(img, 0, 0);
        resolve(canvas.toDataURL('image/png'));
      } else {
        reject(new Error('Failed to get canvas context'));
      }
    };
    img.onerror = () => reject(new Error('Failed to load image'));
    img.src = src;
  });
};

export const generateApiDocumentationPDF = async (endpoints: Endpoint[]) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.getWidth();
  const margin = 14;
  let yPosition = 15;

  // Add logo
  try {
    const logoDataURL = await loadImageAsDataURL('/1.png');
    const logoImg = new Image();
    logoImg.src = logoDataURL;
    await new Promise((resolve) => {
      logoImg.onload = resolve;
    });

    const logoWidth = 60;
    const logoHeight = (logoImg.height / logoImg.width) * logoWidth;
    doc.addImage(logoDataURL, 'PNG', margin, yPosition, logoWidth, logoHeight);
    yPosition += logoHeight + 8;
  } catch (e) {
    console.error('Failed to load logo:', e);
  }

  // Title
  doc.setFontSize(20);
  doc.setTextColor(7, 43, 164);
  doc.text('Fineksi Lens - Intelligent Document Processing', margin, yPosition);

  yPosition += 12;

  // Header Requirements Section
  doc.setFontSize(14);
  doc.setTextColor(7, 43, 164);
  doc.text('Authentication', margin, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setTextColor(31, 81, 254);
  doc.text('Required Headers:', margin, yPosition);
  yPosition += 6;

  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('• x-client-id: Your client ID', margin + 5, yPosition);
  yPosition += 5;
  doc.text('• x-client-secret: Your client secret', margin + 5, yPosition);
  yPosition += 8;

  doc.setFontSize(10);
  doc.setTextColor(31, 81, 254);
  doc.text('Base URLs:', margin, yPosition);
  yPosition += 6;

  doc.setFontSize(9);
  doc.setTextColor(71, 85, 105);
  doc.text('• Sandbox: https://sandbox-hub.api.fineksi.com/v1/idp/', margin + 5, yPosition);
  yPosition += 5;
  doc.text('• Production: https://hub.api.fineksi.com/app/idp', margin + 5, yPosition);

  yPosition += 15;

  // Process each endpoint
  endpoints.forEach((endpoint, index) => {
    // Check if we need a new page
    if (yPosition > 250) {
      doc.addPage();
      yPosition = 20;
    }

    // Endpoint number and name
    doc.setFontSize(16);
    doc.setTextColor(7, 43, 164);
    doc.text(`${index + 1}. ${endpoint.name}`, margin, yPosition);
    yPosition += 8;

    // Method and Path
    doc.setFontSize(11);
    doc.setTextColor(31, 81, 254);
    const methodBadge = `${endpoint.method}`;
    doc.text(methodBadge, margin, yPosition);

    doc.setTextColor(71, 85, 105);
    doc.text(`${endpoint.path}`, margin + 20, yPosition);
    yPosition += 8;

    // Description
    if (endpoint.description) {
      doc.setFontSize(10);
      doc.setTextColor(100, 116, 139);
      const descLines = doc.splitTextToSize(endpoint.description, pageWidth - 2 * margin);
      doc.text(descLines, margin, yPosition);
      yPosition += descLines.length * 5 + 5;
    }

    // Request Body (Predefined Structure)
    if (yPosition > 240) {
      doc.addPage();
      yPosition = 20;
    }

    doc.setFontSize(12);
    doc.setTextColor(7, 43, 164);
    doc.text('Request Body (Predefined):', margin, yPosition);
    yPosition += 6;

    const predefinedRequestFields = [
      ['remark', 'string', 'Your reference text'],
      ['description', 'string', 'Description for this analysis'],
      ['filedata', 'string', 'Base64 encoded file data'],
      ['fileurl', 'string', 'URL to the file (e.g., https://example.com/file.pdf)'],
      ['filename', 'string', 'Name of the file (e.g., document.pdf)'],
      ['filetype', 'string', 'Type of file (e.g., pdf)'],
      ['password', 'string', 'Password for protected files']
    ];

    autoTable(doc, {
      startY: yPosition,
      head: [['Field', 'Type', 'Description']],
      body: predefinedRequestFields,
      theme: 'striped',
      headStyles: { fillColor: [31, 81, 254], fontSize: 10 },
      styles: { fontSize: 9, cellPadding: 3 },
      margin: { left: margin },
      tableWidth: pageWidth - 2 * margin,
      columnStyles: {
        0: { cellWidth: 50 },
        1: { cellWidth: 30 },
        2: { cellWidth: 'auto' }
      }
    });
    yPosition = (doc as any).lastAutoTable.finalY + 8;

    // Response Body
    if (endpoint.responseBody && endpoint.responseBody.trim() !== '{}') {
      if (yPosition > 240) {
        doc.addPage();
        yPosition = 20;
      }

      doc.setFontSize(12);
      doc.setTextColor(7, 43, 164);
      doc.text('Response Body:', margin, yPosition);
      yPosition += 6;

      try {
        const responseJson = JSON.parse(endpoint.responseBody);

        // Show the complete response example with actual data
        doc.setFontSize(9);
        doc.setTextColor(71, 85, 105);
        doc.text('Response Example:', margin, yPosition);
        yPosition += 5;

        // Remove _metadata from display (it's only used internally for field descriptions)
        const { _metadata, ...displayJson } = responseJson;
        const responseExample = JSON.stringify(displayJson, null, 2);
        const exampleLines = doc.splitTextToSize(responseExample, pageWidth - 2 * margin - 8);

        doc.setFont('courier');
        doc.setFontSize(8);
        doc.setTextColor(51, 65, 85);

        const maxLinesPerPage = 35;
        let currentLine = 0;

        while (currentLine < exampleLines.length) {
          if (yPosition > 260) {
            doc.addPage();
            yPosition = 20;
          }

          const remainingLines = Math.min(maxLinesPerPage, exampleLines.length - currentLine);
          const linesToDisplay = exampleLines.slice(currentLine, currentLine + remainingLines);

          // Draw code block background
          const blockHeight = linesToDisplay.length * 3.5 + 4;
          doc.setFillColor(248, 250, 252);
          doc.setDrawColor(226, 232, 240);
          doc.rect(margin, yPosition - 2, pageWidth - 2 * margin, blockHeight, 'FD');

          // Add text inside code block
          doc.text(linesToDisplay, margin + 4, yPosition + 2);
          yPosition += blockHeight + 2;
          currentLine += remainingLines;

          if (currentLine < exampleLines.length) {
            doc.addPage();
            yPosition = 20;
          }
        }

        // Reset font to normal
        doc.setFont('helvetica');
        yPosition += 6;

        // Extract fields from results with descriptions
        const resultsObj = responseJson?.data?.results || {};
        const metadata = responseJson?._metadata?.fields || {};
        const responseFields = extractFieldsWithDescriptionFromResults(resultsObj, metadata);

        if (responseFields.length > 0) {
          if (yPosition > 240) {
            doc.addPage();
            yPosition = 20;
          }

          doc.setFontSize(9);
          doc.setTextColor(71, 85, 105);
          doc.text('Results Fields Reference:', margin, yPosition);
          yPosition += 5;

          autoTable(doc, {
            startY: yPosition,
            head: [['Field', 'Type', 'Description']],
            body: responseFields,
            theme: 'striped',
            headStyles: { fillColor: [250, 216, 90], textColor: [7, 43, 164], fontSize: 10 },
            styles: { fontSize: 9, cellPadding: 3 },
            margin: { left: margin },
            tableWidth: pageWidth - 2 * margin,
            columnStyles: {
              0: { cellWidth: 50 },
              1: { cellWidth: 30 },
              2: { cellWidth: 'auto' }
            }
          });
          yPosition = (doc as any).lastAutoTable.finalY + 12;
        }
      } catch (e) {
        doc.setFontSize(9);
        doc.setTextColor(100, 116, 139);
        const jsonLines = doc.splitTextToSize(endpoint.responseBody, pageWidth - 2 * margin - 4);
        doc.text(jsonLines, margin + 2, yPosition);
        yPosition += jsonLines.length * 4 + 12;
      }
    } else {
      yPosition += 10;
    }

    // Separator line
    if (index < endpoints.length - 1) {
      doc.setDrawColor(226, 232, 240);
      doc.line(margin, yPosition, pageWidth - margin, yPosition);
      yPosition += 10;
    }
  });

  // Save the PDF
  const fileName = `API_Documentation_${new Date().toISOString().split('T')[0]}.pdf`;
  doc.save(fileName);
};

// Helper function to extract fields with descriptions from results
const extractFieldsWithDescriptionFromResults = (obj: any, metadata: any = {}, prefix = ''): string[][] => {
  const fields: string[][] = [];

  const processObject = (object: any, path: string) => {
    Object.entries(object).forEach(([key, value]) => {
      const fieldPath = path ? `${path}.${key}` : key;
      const fieldMeta = metadata[fieldPath] || {};
      let description = fieldMeta.description || '';

      // Add choices to description if available
      if (fieldMeta.choices && fieldMeta.choices.length > 0) {
        const choicesText = fieldMeta.choices.join(', ');
        description = description
          ? `${description} (Options: ${choicesText})`
          : `Options: ${choicesText}`;
      }

      if (value === null) {
        fields.push([fieldPath, 'null', description || 'Null value']);
      } else if (Array.isArray(value)) {
        if (value.length > 0 && typeof value[0] === 'object' && value[0] !== null) {
          fields.push([fieldPath, 'array of objects', description || 'Array containing objects']);
          Object.entries(value[0]).forEach(([childKey, childValue]) => {
            const childPath = `${fieldPath}[].${childKey}`;
            const childMeta = metadata[childPath] || {};
            let childDesc = childMeta.description || '';

            // Add choices to child description if available
            if (childMeta.choices && childMeta.choices.length > 0) {
              const childChoicesText = childMeta.choices.join(', ');
              childDesc = childDesc
                ? `${childDesc} (Options: ${childChoicesText})`
                : `Options: ${childChoicesText}`;
            }

            const childType = childValue === null ? 'null' : Array.isArray(childValue) ? 'array' : typeof childValue;
            const exampleVal = getExampleValue(childValue);
            fields.push([childPath, childType, childDesc || `Example: ${exampleVal}`]);
          });
        } else {
          const exampleVal = value.length > 0 ? JSON.stringify(value).substring(0, 50) : '[]';
          fields.push([fieldPath, 'array', description || `Example: ${exampleVal}`]);
        }
      } else if (typeof value === 'object') {
        processObject(value, fieldPath);
      } else {
        const type = typeof value;
        const exampleValue = String(value);
        fields.push([fieldPath, type, description || `Example: ${exampleValue}`]);
      }
    });
  };

  processObject(obj, prefix);
  return fields;
};

const getExampleValue = (value: any): string => {
  if (value === null) return 'null';
  if (Array.isArray(value)) {
    return value.length > 0 ? JSON.stringify(value).substring(0, 30) + (JSON.stringify(value).length > 30 ? '...' : '') : '[]';
  }
  if (typeof value === 'object') return '{...}';
  return String(value).substring(0, 50);
};
