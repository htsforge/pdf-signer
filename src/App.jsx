import React, { useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { PDFDocument } from "pdf-lib";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// PDF WORKER
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

export default function App() {
  const [pdfFile, setPdfFile] = useState(null);
  const [pdfBytes, setPdfBytes] = useState(null);

  const [numPages, setNumPages] = useState(0);

  const [signature, setSignature] = useState(null);
  const [signatureFile, setSignatureFile] = useState(null);

  // SIGNATURE POSITION + PAGE
  const [signatureData, setSignatureData] = useState({
    x: 100,
    y: 100,
    page: 1,
  });

  // PDF Upload
  const handlePdfUpload = async (e) => {
    try {
      const file = e.target.files[0];

      if (!file) return;

      const url = URL.createObjectURL(file);

      setPdfFile(url);

      const bytes = await file.arrayBuffer();

      setPdfBytes(bytes);
    } catch (error) {
      console.log(error);
      alert("Failed to upload PDF");
    }
  };

  // Signature Upload
  const handleSignatureUpload = (e) => {
    try {
      const file = e.target.files[0];

      if (!file) return;

      setSignatureFile(file);

      const imageUrl = URL.createObjectURL(file);

      setSignature(imageUrl);
    } catch (error) {
      console.log(error);
      alert("Failed to upload signature");
    }
  };

  // CLICK TO PLACE SIGNATURE
  const handlePageClick = (e, pageNumber) => {
    if (!signature) return;

    const rect = e.currentTarget.getBoundingClientRect();

    const x = e.clientX - rect.left;

    const y = e.clientY - rect.top;

    setSignatureData({
      x,
      y,
      page: pageNumber,
    });
  };

  // SAVE PDF
  const handleSavePdf = async () => {
    try {
      if (!pdfBytes) {
        alert("Upload PDF first");
        return;
      }

      if (!signatureFile) {
        alert("Upload signature first");
        return;
      }

      const pdfDoc = await PDFDocument.load(pdfBytes);

      const pages = pdfDoc.getPages();

      // SELECTED PAGE
      const selectedPage =
        pages[signatureData.page - 1];

      const pdfWidth = selectedPage.getWidth();

      const pdfHeight = selectedPage.getHeight();

      // PAGE WIDTH USED IN UI
      const renderedWidth = 1000;

      // SCALE
      const scale = pdfWidth / renderedWidth;

      // LOAD IMAGE
      const signatureBytes =
        await signatureFile.arrayBuffer();

      let image;

      if (signatureFile.type.includes("png")) {
        image = await pdfDoc.embedPng(signatureBytes);
      } else {
        image = await pdfDoc.embedJpg(signatureBytes);
      }

      // IMAGE SIZE
      const imageWidth = 150 * scale;
      const imageHeight = 80 * scale;

      // PDF COORDINATES
      const pdfX = signatureData.x * scale;

      const pdfY =
        pdfHeight -
        signatureData.y * scale -
        imageHeight;

      // DRAW IMAGE
      selectedPage.drawImage(image, {
        x: pdfX,
        y: pdfY,
        width: imageWidth,
        height: imageHeight,
      });

      // SAVE
      const modifiedPdf = await pdfDoc.save();

      const blob = new Blob([modifiedPdf], {
        type: "application/pdf",
      });

      const url = URL.createObjectURL(blob);

      const a = document.createElement("a");

      a.href = url;

      a.download = "signed-document.pdf";

      document.body.appendChild(a);

      a.click();

      document.body.removeChild(a);

      URL.revokeObjectURL(url);
    } catch (error) {
      console.log(error);
      alert("Failed to save PDF");
    }
  };

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "#f3f4f6",
        padding: "20px",
      }}
    >
      {/* TOP BAR */}
      <div
        style={{
          background: "white",
          padding: "15px",
          borderRadius: "12px",
          marginBottom: "20px",
          display: "flex",
          gap: "10px",
          flexWrap: "wrap",
          alignItems: "center",
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
        }}
      >
        <input
          type="file"
          accept="application/pdf"
          onChange={handlePdfUpload}
        />

        <input
          type="file"
          accept="image/png,image/jpeg"
          onChange={handleSignatureUpload}
        />

        <button
          onClick={handleSavePdf}
          style={{
            padding: "10px 20px",
            border: "none",
            borderRadius: "8px",
            background: "#2563eb",
            color: "white",
            cursor: "pointer",
            fontWeight: "bold",
          }}
        >
          Save & Download
        </button>
      </div>

      {/* PDF VIEWER */}
      <div
        style={{
          background: "white",
          padding: "20px",
          borderRadius: "12px",
          boxShadow: "0 2px 10px rgba(0,0,0,0.1)",
        }}
      >
        {pdfFile && (
          <Document
            file={pdfFile}
            onLoadSuccess={({ numPages }) => {
              setNumPages(numPages);
            }}
          >
            {Array.from(
              new Array(numPages),
              (_, index) => {
                const pageNumber = index + 1;

                return (
                  <div
                    key={pageNumber}
                    onClick={(e) =>
                      handlePageClick(e, pageNumber)
                    }
                    style={{
                      position: "relative",
                      marginBottom: "20px",
                      cursor: "crosshair",
                    }}
                  >
                    <Page
                      pageNumber={pageNumber}
                      width={1000}
                      renderTextLayer={false}
                      renderAnnotationLayer={false}
                    />

                    {/* SIGNATURE PREVIEW */}
                    {signature &&
                      signatureData.page ===
                        pageNumber && (
                        <img
                          src={signature}
                          alt="signature"
                          style={{
                            position: "absolute",
                            left: `${signatureData.x}px`,
                            top: `${signatureData.y}px`,
                            width: "150px",
                            height: "80px",
                            border:
                              "2px dashed #2563eb",
                            background: "white",
                            padding: "4px",
                            pointerEvents: "none",
                            zIndex: 999,
                          }}
                        />
                      )}
                  </div>
                );
              }
            )}
          </Document>
        )}
      </div>
    </div>
  );
}