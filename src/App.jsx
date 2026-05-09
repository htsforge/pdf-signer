import React, { useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import {
  PDFDocument,
  degrees,
} from "pdf-lib";

import Swal from "sweetalert2";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// PDF WORKER
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

export default function App() {
  const containerRef = useRef(null);

  const [pdfFile, setPdfFile] =
    useState(null);

  const [pdfBytes, setPdfBytes] =
    useState(null);

  const [numPages, setNumPages] =
    useState(0);

  const [signature, setSignature] =
    useState(null);

  const [signatureFile, setSignatureFile] =
    useState(null);

  // SIGNATURE POSITION
  const [signatureData, setSignatureData] =
    useState({
      x: 100,
      y: 100,
      page: 1,
    });

  // DRAGGING
  const [dragging, setDragging] =
    useState(false);

  // FREE ROTATION
  const [rotating, setRotating] =
    useState(false);

  // ROTATION ANGLE
  const [rotation, setRotation] =
    useState(0);

  // SIZE
  const signatureWidth = 150;
  const signatureHeight = 80;

  // BUTTON STYLE
  const buttonStyle = {
    padding: "10px 20px",
    border: "none",
    borderRadius: "8px",
    background: "#2563eb",
    color: "white",
    cursor: "pointer",
    fontWeight: "bold",
  };

  // PDF Upload
  const handlePdfUpload = async (e) => {
    try {
      const file = e.target.files[0];

      if (!file) return;

      const url =
        URL.createObjectURL(file);

      setPdfFile(url);

      const bytes =
        await file.arrayBuffer();

      setPdfBytes(bytes);
    } catch (error) {
      console.log(error);

      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to upload PDF",
      });
    }
  };

  // SIGNATURE UPLOAD
  const handleSignatureUpload = (e) => {
    try {
      const file = e.target.files[0];

      if (!file) return;

      setSignatureFile(file);

      const imageUrl =
        URL.createObjectURL(file);

      setSignature(imageUrl);
    } catch (error) {
      console.log(error);

      Swal.fire({
        icon: "error",
        title: "Error",
        text:
          "Failed to upload signature",
      });
    }
  };

  // CLICK TO PLACE
  const handlePageClick = (
    e,
    pageNumber
  ) => {
    if (
      !signature ||
      dragging ||
      rotating
    )
      return;

    const rect =
      e.currentTarget.getBoundingClientRect();

    let x = e.clientX - rect.left;

    let y = e.clientY - rect.top;

    // KEEP INSIDE PDF
    x = Math.max(
      0,
      Math.min(
        x,
        rect.width - signatureWidth
      )
    );

    y = Math.max(
      0,
      Math.min(
        y,
        rect.height - signatureHeight
      )
    );

    setSignatureData({
      x,
      y,
      page: pageNumber,
    });
  };

  // START DRAG
  const handleDragStart = (e) => {
    e.stopPropagation();

    setDragging(true);
  };

  // START ROTATE
  const handleRotateStart = (e) => {
    e.stopPropagation();

    setRotating(true);
  };

  // MOUSE MOVE
  const handleMouseMove = (
    e,
    pageNumber
  ) => {
    const rect =
      e.currentTarget.getBoundingClientRect();

    // DRAGGING
    if (
      dragging &&
      signatureData.page === pageNumber
    ) {
      let x = e.clientX - rect.left;

      let y = e.clientY - rect.top;

      x = Math.max(
        0,
        Math.min(
          x,
          rect.width - signatureWidth
        )
      );

      y = Math.max(
        0,
        Math.min(
          y,
          rect.height -
            signatureHeight
        )
      );

      setSignatureData((prev) => ({
        ...prev,
        x,
        y,
      }));
    }

    // FREE ROTATION
    if (
      rotating &&
      signatureData.page === pageNumber
    ) {
      const centerX =
        signatureData.x +
        signatureWidth / 2;

      const centerY =
        signatureData.y +
        signatureHeight / 2;

      const mouseX =
        e.clientX - rect.left;

      const mouseY =
        e.clientY - rect.top;

      const angle =
        Math.atan2(
          mouseY - centerY,
          mouseX - centerX
        ) *
        (180 / Math.PI);

      setRotation(angle);
    }
  };

  // STOP ACTIONS
  const handleMouseUp = () => {
    setDragging(false);

    setRotating(false);
  };

  // SAVE PDF
  const handleSavePdf = async () => {
    try {
      if (!pdfBytes) {
        Swal.fire({
          icon: "warning",
          title: "Upload PDF",
          text:
            "Please upload PDF first",
        });

        return;
      }

      if (!signatureFile) {
        Swal.fire({
          icon: "warning",
          title:
            "Upload Signature",
          text:
            "Please upload signature first",
        });

        return;
      }

      const pdfDoc =
        await PDFDocument.load(pdfBytes);

      const pages = pdfDoc.getPages();

      const selectedPage =
        pages[signatureData.page - 1];

      const pdfWidth =
        selectedPage.getWidth();

      const pdfHeight =
        selectedPage.getHeight();

      // UI WIDTH
      const renderedWidth = 1000;

      const scale =
        pdfWidth / renderedWidth;

      // LOAD IMAGE
      const signatureBytes =
        await signatureFile.arrayBuffer();

      let image;

      if (
        signatureFile.type.includes("png")
      ) {
        image = await pdfDoc.embedPng(
          signatureBytes
        );
      } else {
        image = await pdfDoc.embedJpg(
          signatureBytes
        );
      }

      // IMAGE SIZE
      const imageWidth =
        signatureWidth * scale;

      const imageHeight =
        signatureHeight * scale;

      // PDF POSITION
      const pdfX =
        signatureData.x * scale;

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
        rotate: degrees(rotation),
      });

      // SAVE
      const modifiedPdf =
        await pdfDoc.save();

      const blob = new Blob(
        [modifiedPdf],
        {
          type: "application/pdf",
        }
      );

      const url =
        URL.createObjectURL(blob);

      const a =
        document.createElement("a");

      // FILE NAME POPUP
      const { value: fileName } =
        await Swal.fire({
          title: "Enter file name",
          input: "text",
          inputValue: "signed-pdf",
          inputPlaceholder:
            "Enter PDF name",
          showCancelButton: true,
          confirmButtonText:
            "Download",
          inputValidator: (
            value
          ) => {
            if (!value) {
              return "File name is required";
            }
          },
        });

      if (!fileName) {
        return;
      }

      a.href = url;

      a.download = `${fileName}.pdf`;

      document.body.appendChild(a);

      a.click();

      document.body.removeChild(a);

      URL.revokeObjectURL(url);

      Swal.fire({
        icon: "success",
        title: "Downloaded",
        text:
          "PDF downloaded successfully",
      });
    } catch (error) {
      console.log(error);

      Swal.fire({
        icon: "error",
        title: "Error",
        text: "Failed to save PDF",
      });
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
          boxShadow:
            "0 2px 10px rgba(0,0,0,0.1)",
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
          onChange={
            handleSignatureUpload
          }
        />

        <button
          onClick={() =>
            setRotation(
              (prev) => prev - 90
            )
          }
          style={buttonStyle}
        >
          Rotate Left
        </button>

        <button
          onClick={() =>
            setRotation(
              (prev) => prev + 90
            )
          }
          style={buttonStyle}
        >
          Rotate Right
        </button>

        <button
          onClick={handleSavePdf}
          style={buttonStyle}
        >
          Save & Download
        </button>
      </div>

      {/* PDF */}
      <div
        ref={containerRef}
        style={{
          background: "white",
          padding: "20px",
          borderRadius: "12px",
          boxShadow:
            "0 2px 10px rgba(0,0,0,0.1)",
        }}
      >
        {pdfFile && (
          <Document
            file={pdfFile}
            onLoadSuccess={({
              numPages,
            }) =>
              setNumPages(numPages)
            }
          >
            {Array.from(
              new Array(numPages),
              (_, index) => {
                const pageNumber =
                  index + 1;

                return (
                  <div
                    key={pageNumber}
                    onClick={(e) =>
                      handlePageClick(
                        e,
                        pageNumber
                      )
                    }
                    onMouseMove={(e) =>
                      handleMouseMove(
                        e,
                        pageNumber
                      )
                    }
                    onMouseUp={
                      handleMouseUp
                    }
                    onMouseLeave={
                      handleMouseUp
                    }
                    style={{
                      position:
                        "relative",
                      marginBottom:
                        "20px",
                      userSelect:
                        "none",
                    }}
                  >
                    <Page
                      pageNumber={
                        pageNumber
                      }
                      width={1000}
                      renderTextLayer={
                        false
                      }
                      renderAnnotationLayer={
                        false
                      }
                    />

                    {/* SIGNATURE */}
                    {signature &&
                      signatureData.page ===
                        pageNumber && (
                        <div
                          style={{
                            position:
                              "absolute",
                            left: `${signatureData.x}px`,
                            top: `${signatureData.y}px`,
                            width: `${signatureWidth}px`,
                            height: `${signatureHeight}px`,
                            transform: `rotate(${rotation}deg)`,
                            transformOrigin:
                              "center",
                            zIndex: 999,
                          }}
                        >
                          <img
                            src={signature}
                            alt="signature"
                            onMouseDown={
                              handleDragStart
                            }
                            draggable={
                              false
                            }
                            style={{
                              width: "100%",
                              height: "100%",
                              border:
                                "2px dashed #2563eb",
                              background:
                                "white",
                              padding: "4px",
                              cursor: "move",
                              userSelect:
                                "none",
                            }}
                          />

                          {/* ROTATE HANDLE */}
                          <div
                            onMouseDown={
                              handleRotateStart
                            }
                            style={{
                              position:
                                "absolute",
                              width: "18px",
                              height: "18px",
                              borderRadius:
                                "50%",
                              background:
                                "#2563eb",
                              right: "-10px",
                              top: "-10px",
                              cursor: "grab",
                              border:
                                "2px solid white",
                            }}
                          />
                        </div>
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