import multer from "multer";

const XLSX_MIME =
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet";

export const excelUpload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 10 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const isXlsx =
      file.mimetype === XLSX_MIME ||
      file.originalname.toLowerCase().endsWith(".xlsx");
    cb(null, isXlsx);
  },
});
