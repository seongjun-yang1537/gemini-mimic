const express = require("express");
const fs = require("node:fs");
const path = require("node:path");
const { AppError } = require("../http/errors/AppError");
const { asyncRoute } = require("../http/middlewares/errorHandler");

const folderDefinitions = [
  { id: "input", name: "입력 영상", category: "input" },
  { id: "reference", name: "레퍼런스 이미지", category: "reference" },
  { id: "generated_image", name: "생성 이미지", category: "generated_image" },
  { id: "generated_video", name: "생성 영상", category: "generated_video" },
  { id: "export", name: "내보내기", category: "export" },
];

function convertAssetToDriveFile(assetItem) {
  return {
    id: assetItem.id,
    name: assetItem.fileName,
    path: `/${assetItem.category}/${assetItem.fileName}`,
    parentId: assetItem.category,
    type: "file",
    mimeType: assetItem.mimeType,
    size: assetItem.fileSize,
    thumbnailUrl: `/api/drive/files/${assetItem.id}/thumbnail`,
    modifiedAt: assetItem.updatedAt,
    createdAt: assetItem.createdAt,
    fullPath: `내 드라이브/${assetItem.category}/${assetItem.fileName}`,
  };
}

function typeFilterMatches(driveItem, filterType) {
  if (filterType === "all") {
    return true;
  }
  if (filterType === "folder") {
    return driveItem.type === "folder";
  }
  if (filterType === "image") {
    return driveItem.type === "file" && driveItem.mimeType?.startsWith("image/");
  }
  if (filterType === "video") {
    return driveItem.type === "file" && driveItem.mimeType?.startsWith("video/");
  }
  return true;
}

function sortDriveItems(itemList, sortField, sortOrder) {
  const sortedItemList = [...itemList].sort((leftItem, rightItem) => {
    let leftValue = leftItem[sortField];
    let rightValue = rightItem[sortField];

    if (sortField === "name") {
      leftValue = String(leftValue || "").toLowerCase();
      rightValue = String(rightValue || "").toLowerCase();
      if (leftValue < rightValue) {
        return -1;
      }
      if (leftValue > rightValue) {
        return 1;
      }
      return 0;
    }

    const numericLeftValue = Number(leftValue || 0);
    const numericRightValue = Number(rightValue || 0);
    return numericLeftValue - numericRightValue;
  });

  if (sortOrder === "desc") {
    sortedItemList.reverse();
  }
  return sortedItemList;
}

function paginateItems(itemList, pageNumber, limitNumber) {
  const offsetIndex = (pageNumber - 1) * limitNumber;
  return itemList.slice(offsetIndex, offsetIndex + limitNumber);
}

function buildDriveState(assetService) {
  const folderItemList = folderDefinitions.map((folderItem) => ({
    id: folderItem.id,
    name: folderItem.name,
    path: `/${folderItem.id}`,
    parentId: "root",
    type: "folder",
    modifiedAt: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    childCount: assetService.listAssets({ category: folderItem.category }).length,
  }));
  const driveFileList = assetService.listAssets().map(convertAssetToDriveFile);
  return { folderItemList, driveFileList };
}

function createDriveRoutes({ assetService, uploadMiddleware, runStore, pipelineOrchestrator }) {
  const driveRouter = express.Router();
  const localUploadMap = new Map();

  driveRouter.get("/api/drive/folders/:folderId/contents", (request, response) => {
    const targetFolderId = request.params.folderId;
    const sortField = ["name", "modifiedAt", "size"].includes(request.query.sort) ? request.query.sort : "name";
    const sortOrder = request.query.order === "desc" ? "desc" : "asc";
    const typeFilter = request.query.type || "all";
    const pageNumber = Math.max(1, Number(request.query.page || 1));
    const limitNumber = Math.min(200, Math.max(1, Number(request.query.limit || 50)));
    const { folderItemList, driveFileList } = buildDriveState(assetService);

    let scopedItemList = [];
    let pathSegments = [{ id: null, name: "내 드라이브" }];

    if (targetFolderId === "root") {
      scopedItemList = folderItemList;
    } else {
      const folderDefinition = folderDefinitions.find((folderItem) => folderItem.id === targetFolderId);
      if (!folderDefinition) {
        throw AppError.notFound("folder not found", { folderId: targetFolderId }, "FOLDER_NOT_FOUND");
      }
      pathSegments = [...pathSegments, { id: folderDefinition.id, name: folderDefinition.name }];
      scopedItemList = driveFileList.filter((driveFileItem) => driveFileItem.parentId === targetFolderId);
    }

    const filteredItemList = scopedItemList.filter((driveItem) => typeFilterMatches(driveItem, typeFilter));
    const sortedItemList = sortDriveItems(filteredItemList, sortField, sortOrder);
    const pagedItemList = paginateItems(sortedItemList, pageNumber, limitNumber);
    const totalPages = Math.max(1, Math.ceil(sortedItemList.length / limitNumber));

    response.json({
      folderId: targetFolderId,
      path: pathSegments,
      items: pagedItemList,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        totalItems: sortedItemList.length,
        totalPages,
      },
    });
  });

  driveRouter.get("/api/drive/search", (request, response) => {
    const keywordText = String(request.query.q || "").trim().toLowerCase();
    const typeFilter = request.query.type || "all";
    const pageNumber = Math.max(1, Number(request.query.page || 1));
    const limitNumber = Math.min(200, Math.max(1, Number(request.query.limit || 50)));

    if (!keywordText) {
      throw AppError.badRequest("검색어를 입력하세요.", [{ field: "q", message: "required" }], "INVALID_SEARCH_QUERY");
    }

    const driveFileList = assetService.listAssets().map(convertAssetToDriveFile);
    const filteredItemList = driveFileList
      .filter((driveFileItem) => driveFileItem.name.toLowerCase().includes(keywordText))
      .filter((driveFileItem) => typeFilterMatches(driveFileItem, typeFilter));
    const pagedItemList = paginateItems(filteredItemList, pageNumber, limitNumber);

    response.json({
      items: pagedItemList,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        totalItems: filteredItemList.length,
        totalPages: Math.max(1, Math.ceil(filteredItemList.length / limitNumber)),
      },
    });
  });

  driveRouter.get("/api/drive/files/:fileId/thumbnail", (request, response) => {
    const assetItem = assetService.getAssetById(request.params.fileId);
    if (!assetItem) {
      throw AppError.notFound("file not found", { fileId: request.params.fileId }, "FILE_NOT_FOUND");
    }
    response.set("Cache-Control", "public, max-age=3600");
    response.type(assetItem.mimeType);
    response.sendFile(path.resolve(assetItem.filePath));
  });

  driveRouter.get("/api/drive/files/:fileId/preview", (request, response) => {
    const assetItem = assetService.getAssetById(request.params.fileId);
    if (!assetItem) {
      throw AppError.notFound("file not found", { fileId: request.params.fileId }, "FILE_NOT_FOUND");
    }
    response.json({
      id: assetItem.id,
      name: assetItem.fileName,
      mimeType: assetItem.mimeType,
      size: assetItem.fileSize,
      previewUrl: `/api/drive/files/${assetItem.id}/stream`,
      metadata: {
        width: null,
        height: null,
        duration: null,
        codec: null,
      },
      modifiedAt: assetItem.updatedAt,
    });
  });

  driveRouter.get("/api/drive/files/:fileId/stream", (request, response) => {
    const assetItem = assetService.getAssetById(request.params.fileId);
    if (!assetItem) {
      throw AppError.notFound("file not found", { fileId: request.params.fileId }, "FILE_NOT_FOUND");
    }

    const resolvedFilePath = path.resolve(assetItem.filePath);
    const fileStats = fs.statSync(resolvedFilePath);
    const fileRangeHeader = request.headers.range;

    if (fileRangeHeader && assetItem.mimeType.startsWith("video/")) {
      const [startText, endText] = fileRangeHeader.replace(/bytes=/, "").split("-");
      const startByteIndex = Number(startText);
      const endByteIndex = endText ? Number(endText) : fileStats.size - 1;
      const chunkSize = endByteIndex - startByteIndex + 1;

      response.writeHead(206, {
        "Content-Range": `bytes ${startByteIndex}-${endByteIndex}/${fileStats.size}`,
        "Accept-Ranges": "bytes",
        "Content-Length": chunkSize,
        "Content-Type": assetItem.mimeType,
      });

      fs.createReadStream(resolvedFilePath, { start: startByteIndex, end: endByteIndex }).pipe(response);
      return;
    }

    response.set("Accept-Ranges", "bytes");
    response.type(assetItem.mimeType);
    response.sendFile(resolvedFilePath);
  });

  driveRouter.post("/api/upload", uploadMiddleware.single("file"), (request, response) => {
    if (!request.file?.path) {
      throw AppError.badRequest("업로드 파일이 필요합니다.", [{ field: "file", message: "required" }], "UPLOAD_FAILED");
    }

    const uploadType = request.body?.type === "video" ? "video" : "image";
    const storedUploadId = `upload_${Date.now()}_${Math.random().toString(16).slice(2)}`;
    localUploadMap.set(storedUploadId, {
      id: storedUploadId,
      path: request.file.path,
      name: request.file.originalname,
      mimeType: request.file.mimetype,
      size: request.file.size,
      type: uploadType,
    });

    response.json({
      id: storedUploadId,
      name: request.file.originalname,
      mimeType: request.file.mimetype,
      size: request.file.size,
      thumbnailUrl: `/uploads/${path.basename(request.file.path)}`,
      url: `/uploads/${path.basename(request.file.path)}`,
    });
  });

  driveRouter.post("/api/generate", asyncRoute(async (request, response) => {
    const promptText = typeof request.body?.prompt === "string" ? request.body.prompt.trim() : "";
    const attachmentList = Array.isArray(request.body?.attachments) ? request.body.attachments : [];
    const selectedVideoAttachment = attachmentList.find((attachmentItem) => attachmentItem.type === "video");
    const selectedImageAttachmentList = attachmentList.filter((attachmentItem) => attachmentItem.type === "image");

    let inputVideoPath;
    let inputAssetId;

    if (selectedVideoAttachment?.source === "server" && selectedVideoAttachment.fileId) {
      const videoAsset = assetService.getAssetById(selectedVideoAttachment.fileId);
      if (!videoAsset) {
        throw AppError.notFound("file not found", { id: selectedVideoAttachment.fileId }, "FILE_NOT_FOUND");
      }
      inputVideoPath = videoAsset.filePath;
      inputAssetId = videoAsset.id;
    }

    if (selectedVideoAttachment?.source === "local" && selectedVideoAttachment.uploadId) {
      const uploadedVideoItem = localUploadMap.get(selectedVideoAttachment.uploadId);
      if (uploadedVideoItem) {
        const savedAsset = assetService.registerAssetFromFile(uploadedVideoItem.path, {
          category: "input",
          tagSeed: uploadedVideoItem.name,
          originalFileName: uploadedVideoItem.name,
        });
        inputVideoPath = savedAsset.filePath;
        inputAssetId = savedAsset.id;
      }
    }

    const selectedReferenceAssets = selectedImageAttachmentList.flatMap((attachmentItem) => {
      if (attachmentItem.source === "server" && attachmentItem.fileId) {
        const foundAsset = assetService.getAssetById(attachmentItem.fileId);
        return foundAsset ? [foundAsset] : [];
      }
      if (attachmentItem.source === "local" && attachmentItem.uploadId) {
        const uploadedImageItem = localUploadMap.get(attachmentItem.uploadId);
        if (!uploadedImageItem) {
          return [];
        }
        const savedAsset = assetService.registerAssetFromFile(uploadedImageItem.path, {
          category: "reference",
          tagSeed: uploadedImageItem.name,
          originalFileName: uploadedImageItem.name,
        });
        return [savedAsset];
      }
      return [];
    });

    if (!promptText && !inputVideoPath) {
      throw AppError.badRequest("프롬프트 또는 영상 입력이 필요합니다.", null, "RUN_INPUT_REQUIRED");
    }

    const createdRun = await runStore.createRun({
      inputVideo: inputVideoPath,
      inputText: promptText || undefined,
      inputAssetId: inputAssetId || undefined,
      selectedReferenceAssets: selectedReferenceAssets.map((assetItem) => ({
        id: assetItem.id,
        filePath: assetItem.filePath,
        fileName: assetItem.fileName,
        tagId: assetItem.tagId,
      })),
    });
    pipelineOrchestrator.execute(createdRun.id).catch(() => {});

    response.status(202).json({
      jobId: createdRun.id,
      status: "queued",
      estimatedSeconds: 30,
    });
  }));

  return driveRouter;
}

module.exports = { createDriveRoutes };
