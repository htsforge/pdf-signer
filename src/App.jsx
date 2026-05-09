import React, { useRef, useState } from "react";
import { Document, Page, pdfjs } from "react-pdf";
import { PDFDocument, degrees } from "pdf-lib";
import Swal from "sweetalert2";

import "react-pdf/dist/Page/AnnotationLayer.css";
import "react-pdf/dist/Page/TextLayer.css";

// PDF WORKER
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

export default function App() {
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

  const [signatureData, setSignatureData] =
    useState({
      x: 100,
      y: 100,
      page: 1,
    });

  const [dragging, setDragging] =
    useState(false);

  const [rotating, setRotating] =
    useState(false);

  const [rotation, setRotation] =
    useState(0);

  const signatureWidth = 180;
  const signatureHeight = 90;

  // ======================================
  // COLORS
  // ======================================

  const COLORS = {
    primary: "#ff6b00",
    secondary: "#ff8c42",
    dark: "#050816",
    card: "rgba(255,255,255,0.05)",
    border: "rgba(255,255,255,0.08)",
    text: "#ffffff",
    text2: "#9ca3af",
  };

  // ======================================
  // PDF UPLOAD
  // ======================================

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
    }
  };

  // ======================================
  // SIGNATURE UPLOAD
  // ======================================

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
    }
  };

  // ======================================
  // CLICK TO PLACE
  // ======================================

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

    // IMPORTANT
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

  // ======================================
  // DRAG START
  // ======================================

  const handleDragStart = (e) => {
    e.stopPropagation();

    setDragging(true);
  };

  // ======================================
  // ROTATE START
  // ======================================

  const handleRotateStart = (e) => {
    e.stopPropagation();

    setRotating(true);
  };

  // ======================================
  // MOUSE MOVE
  // ======================================

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

      // VERY IMPORTANT
      // KEEP SIGNATURE INSIDE PDF

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

    // ROTATION
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

  // ======================================
  // STOP
  // ======================================

  const handleMouseUp = () => {
    setDragging(false);

    setRotating(false);
  };

  // ======================================
  // SAVE PDF
  // ======================================

  const handleSavePdf = async () => {
    try {
      if (!pdfBytes) {
        Swal.fire({
          icon: "warning",
          title: "Upload PDF",
          text:
            "Please upload PDF first",
          background: "#0f172a",
          color: "#fff",
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
          background: "#0f172a",
          color: "#fff",
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

      const renderedWidth = 1000;

      const scale =
        pdfWidth / renderedWidth;

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

      const imageWidth =
        signatureWidth * scale;

      const imageHeight =
        signatureHeight * scale;

      const pdfX =
        signatureData.x * scale;

      const pdfY =
        pdfHeight -
        signatureData.y * scale -
        imageHeight;

      selectedPage.drawImage(image, {
        x: pdfX,
        y: pdfY,
        width: imageWidth,
        height: imageHeight,
        rotate: degrees(rotation),
      });

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

      const { value: fileName } =
        await Swal.fire({
          title: "Enter file name",
          input: "text",
          inputValue:
            "hts-forge-signed",
          showCancelButton: true,
          confirmButtonText:
            "Download",
          background: "#0f172a",
          color: "#fff",
        });

      if (!fileName) return;

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
        background: "#0f172a",
        color: "#fff",
      });
    } catch (error) {
      console.log(error);
    }
  };

  // ======================================
  // BUTTON STYLES
  // ======================================

  const buttonStyle = {
    width: "100%",
    height: "56px",
    borderRadius: "18px",
    border: "none",
    background:
      "linear-gradient(135deg,#ff6b00,#ff8c42)",
    color: "white",
    fontWeight: "700",
    fontSize: "15px",
    cursor: "pointer",
    boxShadow:
      "0 10px 30px rgba(255,107,0,0.35)",
  };

  const secondaryButton = {
    width: "100%",
    height: "52px",
    borderRadius: "16px",
    border: `1px solid ${COLORS.border}`,
    background:
      "rgba(255,255,255,0.05)",
    color: "white",
    fontWeight: "600",
    fontSize: "14px",
    cursor: "pointer",
  };

  return (
    <div
      style={{
        height: "100vh",
        overflow: "hidden",
        background: `
          radial-gradient(circle at top left, rgba(255,107,0,0.2), transparent 20%),
          radial-gradient(circle at bottom right, rgba(0,56,255,0.15), transparent 20%),
          #050816
        `,
        padding: "24px",
        boxSizing: "border-box",
        fontFamily: "Inter, sans-serif",
      }}
    >
      {/* HEADER */}
      <div
        style={{
          display: "flex",
          justifyContent:
            "space-between",
          alignItems: "center",
          marginBottom: "24px",
        }}
      >
        <div>
          <h1
            style={{
              fontSize: "42px",
              color: "white",
              margin: 0,
              fontWeight: "900",
            }}
          >
            HTS Forge PDF Studio
          </h1>

          <p
            style={{
              color: COLORS.text2,
              marginTop: "8px",
            }}
          >
            Enterprise PDF Signing Platform
          </p>
        </div>

        <div
          style={{
            padding: "12px 20px",
            borderRadius: "999px",
            background:
              "rgba(255,255,255,0.05)",
            border: `1px solid ${COLORS.border}`,
            color: COLORS.primary,
            fontWeight: "700",
          }}
        >
          Hybrid Tech Studio
        </div>
      </div>

      {/* MAIN */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns:
            "320px 1fr",
          gap: "24px",
          height: "calc(100vh - 120px)",
        }}
      >
        {/* SIDEBAR */}
        <div
          style={{
            background:
              "rgba(255,255,255,0.05)",
            backdropFilter: "blur(20px)",
            border: `1px solid ${COLORS.border}`,
            borderRadius: "28px",
            padding: "24px",
            overflow: "hidden",
            height: "100%",
            boxSizing: "border-box",
          }}
        >
          <h2
            style={{
              color: "white",
              marginTop: 0,
              fontSize: "30px",
            }}
          >
            Workspace
          </h2>

          <p
            style={{
              color: COLORS.text2,
              marginBottom: "28px",
            }}
          >
            Upload & manage documents
          </p>

          {/* PDF UPLOAD */}
          <label
            style={{
              display: "block",
              padding: "24px",
              borderRadius: "24px",
              border:
                "2px dashed rgba(255,255,255,0.1)",
              background:
                "rgba(255,255,255,0.03)",
              marginBottom: "20px",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: "40px",
                  marginBottom: "10px",
                }}
              >
                📄
              </div>

              <h3
                style={{
                  color: "white",
                  marginBottom: "6px",
                }}
              >
                Upload PDF
              </h3>

              <p
                style={{
                  color: COLORS.text2,
                  fontSize: "13px",
                }}
              >
                Select your document
              </p>
            </div>

            <input
              hidden
              type="file"
              accept="application/pdf"
              onChange={handlePdfUpload}
            />
          </label>

          {/* SIGNATURE */}
          <label
            style={{
              display: "block",
              padding: "24px",
              borderRadius: "24px",
              border:
                "2px dashed rgba(255,255,255,0.1)",
              background:
                "rgba(255,255,255,0.03)",
              marginBottom: "24px",
              cursor: "pointer",
            }}
          >
            <div
              style={{
                textAlign: "center",
              }}
            >
              <div
                style={{
                  fontSize: "40px",
                  marginBottom: "10px",
                }}
              >
                ✍️
              </div>

              <h3
                style={{
                  color: "white",
                  marginBottom: "6px",
                }}
              >
                Upload Signature
              </h3>

              <p
                style={{
                  color: COLORS.text2,
                  fontSize: "13px",
                }}
              >
                PNG / JPG supported
              </p>
            </div>

            <input
              hidden
              type="file"
              accept="image/png,image/jpeg"
              onChange={
                handleSignatureUpload
              }
            />
          </label>

          {/* BUTTONS */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              gap: "14px",
            }}
          >
            <button
              style={secondaryButton}
              onClick={() =>
                setRotation(
                  (prev) => prev - 90
                )
              }
            >
              Rotate Left
            </button>

            <button
              style={secondaryButton}
              onClick={() =>
                setRotation(
                  (prev) => prev + 90
                )
              }
            >
              Rotate Right
            </button>

            <button
              style={buttonStyle}
              onClick={handleSavePdf}
            >
              Save & Download
            </button>
          </div>
        </div>

        {/* PDF AREA */}
        <div
          style={{
            background:
              "rgba(255,255,255,0.05)",
            backdropFilter: "blur(20px)",
            border: `1px solid ${COLORS.border}`,
            borderRadius: "28px",
            padding: "24px",
            overflowY: "auto",
            overflowX: "hidden",
            height: "100%",
            boxSizing: "border-box",
          }}
        >
          {!pdfFile && (
            <div
              style={{
                height: "100%",
                display: "flex",
                justifyContent:
                  "center",
                alignItems: "center",
                flexDirection: "column",
              }}
            >
              <div
                style={{
                  fontSize: "80px",
                  marginBottom: "20px",
                }}
              >
                🔥
              </div>

              <h2
                style={{
                  color: "white",
                  fontSize: "40px",
                  marginBottom: "8px",
                }}
              >
                HTS Forge
              </h2>

              <p
                style={{
                  color: COLORS.text2,
                }}
              >
                Upload PDF to begin
              </p>
            </div>
          )}

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
                      style={{
                        display: "flex",
                        justifyContent:
                          "center",
                        marginBottom:
                          "40px",
                      }}
                    >
                      {/* IMPORTANT */}
                      {/* THIS IS THE FIX */}

                      <div
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

                          // IMPORTANT
                          // PAGE WRAPPER SIZE

                          width: "1000px",

                          overflow: "hidden",

                          borderRadius:
                            "12px",

                          boxShadow:
                            "0 20px 60px rgba(0,0,0,0.45)",
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
                                src={
                                  signature
                                }
                                alt="signature"
                                draggable={
                                  false
                                }
                                onMouseDown={
                                  handleDragStart
                                }
                                style={{
                                  width:
                                    "100%",

                                  height:
                                    "100%",

                                  background:
                                    "white",

                                  border:
                                    "2px solid #ff6b00",

                                  borderRadius:
                                    "14px",

                                  padding:
                                    "6px",

                                  cursor:
                                    "move",

                                  userSelect:
                                    "none",

                                  boxShadow:
                                    "0 0 25px rgba(255,107,0,0.5)",
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

                                  right:
                                    "-12px",

                                  top: "-12px",

                                  width:
                                    "24px",

                                  height:
                                    "24px",

                                  borderRadius:
                                    "50%",

                                  background:
                                    COLORS.primary,

                                  border:
                                    "3px solid white",

                                  cursor:
                                    "grab",

                                  boxShadow:
                                    "0 0 15px rgba(255,107,0,0.5)",
                                }}
                              />
                            </div>
                          )}
                      </div>
                    </div>
                  );
                }
              )}
            </Document>
          )}
        </div>
      </div>
    </div>
  );
}