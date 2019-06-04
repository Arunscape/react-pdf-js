import PdfJsLib from 'pdfjs-dist';
import React, { useState, useEffect, useRef, useMemo } from 'react';

type ComponentProps = {
  file: string;
  onDocumentComplete: (numPages: number) => void;
  page?: number;
  scale?: number;
  rotate?: number;
  cMapUrl?: string;
  cMapPacked?: boolean;
  workerSrc?: string;
  withCredentials?: boolean;
  fillWidth?: boolean;
  fillHeight?: boolean;
};

const Pdf = ({
  file,
  onDocumentComplete,
  page,
  scale,
  rotate,
  cMapUrl,
  cMapPacked,
  workerSrc,
  withCredentials,
}: ComponentProps) => {
  const canvasEl = useRef<HTMLCanvasElement>(null);
  const [, numPages] = usePdf({
    canvasEl,
    file,
    page,
    scale,
    rotate,
    cMapUrl,
    cMapPacked,
    workerSrc,
    withCredentials,
  });

  useEffect(() => {
    onDocumentComplete(numPages);
  }, [numPages]);

  return <canvas ref={canvasEl} />;
};

Pdf.defaultProps = {
  onDocumentComplete: () => {},
};

type HookProps = {
  canvasEl: React.RefObject<HTMLCanvasElement>;
  file: string;
  scale?: number;
  rotate?: number;
  page?: number;
  cMapUrl?: string;
  cMapPacked?: boolean;
  workerSrc?: string;
  withCredentials?: boolean;
  fillWidth?: boolean;
  fillHeight?: boolean;
};

export const usePdf = ({
  canvasEl,
  file,
  scale = 1,
  rotate = 0,
  page = 1,
  cMapUrl,
  cMapPacked,
  workerSrc = '//cdnjs.cloudflare.com/ajax/libs/pdf.js/2.1.266/pdf.worker.js',
  withCredentials = false,
  fillWidth = false,
  fillHeight = false,
}: HookProps) => {
  const [pdf, setPdf] = useState();

  useEffect(() => {
    PdfJsLib.GlobalWorkerOptions.workerSrc = workerSrc;
  }, []);

  useEffect(() => {
    const config: PdfJsLib.PDFSource = { url: file, withCredentials };
    if (cMapUrl) {
      config.cMapUrl = cMapUrl;
      config.cMapPacked = cMapPacked;
    }
    PdfJsLib.getDocument(config).promise.then(setPdf);
  }, [file, withCredentials]);

  // handle changes
  useEffect(() => {
    const renderPDF = () => {
      pdf.getPage(page).then((p: any) => drawPDF(p));
    };

    if (pdf) {
      window.addEventListener('resize', renderPDF);
    }

    return () => {
      window.removeEventListener('resize', renderPDF);
    };
  }, [pdf, page, scale, rotate, canvasEl]);

  const calculateScale = (pageView: any, parentElement: any) => {
    if (fillWidth) {
      const pageWidth = pageView[2] - pageView[0];
      return parentElement.clientWidth / pageWidth;
    }
    if (fillHeight) {
      const pageHeight = pageView[3] - pageView[1];
      return parentElement.clientHeight / pageHeight;
    }
    return scale;
  };

  // draw a page of the pdf
  const drawPDF = (page: any) => {
    const canvas = canvasEl.current;
    if (!canvas) {
      return;
    }
    // Because this page's rotation option overwrites pdf default rotation value,
    // calculating page rotation option value from pdf default and this component prop rotate.
    const rotation = rotate === 0 ? page.rotate : page.rotate + rotate;
    let dpRatio = 1;
    dpRatio = window.devicePixelRatio;
    const calculatedScale = calculateScale(page.view, canvas.parentElement);
    const adjustedScale = calculatedScale * dpRatio;
    const viewport = page.getViewport({ scale: adjustedScale, rotation });
    const canvasContext = canvas.getContext('2d');
    canvas.style.width = `${viewport.width / dpRatio}px`;
    canvas.style.height = `${viewport.height / dpRatio}px`;
    canvas.height = viewport.height;
    canvas.width = viewport.width;
    const renderContext = {
      canvasContext,
      viewport,
    };
    page.render(renderContext);
  };

  const loading = useMemo(() => !pdf, [pdf]);
  const numPages = useMemo(() => (pdf ? pdf._pdfInfo.numPages : null), [pdf]);

  return [loading, numPages];
};

export default Pdf;
