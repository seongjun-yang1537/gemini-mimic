// Generated under Codex compliance with AGENTS.md (gemini-mimic)
const fs = require("node:fs");
const path = require("node:path");

const mimeTypeByExtension = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
  ".mp4": "video/mp4",
  ".webm": "video/webm",
};

class AssetService {
  constructor({ assetStore, assetsRootPath }) {
    this.assetStore = assetStore;
    this.assetsRootPath = path.resolve(assetsRootPath || "./assets");
    this.assetFolderMap = {
      input: path.join(this.assetsRootPath, "inputs"),
      reference: path.join(this.assetsRootPath, "references"),
      generated_image: path.join(this.assetsRootPath, "generated/images"),
      generated_video: path.join(this.assetsRootPath, "generated/videos"),
      export: path.join(this.assetsRootPath, "exports"),
    };

    Object.values(this.assetFolderMap).forEach((directoryPath) => {
      fs.mkdirSync(directoryPath, { recursive: true });
    });
  }

  getMimeTypeFromFileName(fileName) {
    const extensionName = path.extname(fileName).toLowerCase();
    return mimeTypeByExtension[extensionName] || "application/octet-stream";
  }

  sanitizeTagSeed(tagSeed) {
    return tagSeed
      .normalize("NFC")
      .replace(/\.[^/.]+$/, "")
      .replace(/[^0-9a-zA-Z_가-힣]+/g, "_")
      .replace(/^_+|_+$/g, "")
      .replace(/_+/g, "_") || "asset";
  }

  createUniqueTagId(initialTagSeed) {
    const normalizedTagSeed = this.sanitizeTagSeed(initialTagSeed);
    let candidateTagId = normalizedTagSeed;
    let duplicateSequence = 1;

    while (this.assetStore.getByTagId(candidateTagId)) {
      candidateTagId = `${normalizedTagSeed}_${duplicateSequence}`;
      duplicateSequence += 1;
    }
    return candidateTagId;
  }

  getTargetFolderByCategory(categoryName) {
    const targetFolderPath = this.assetFolderMap[categoryName];
    if (!targetFolderPath) {
      throw new Error("지원하지 않는 category입니다.");
    }
    return targetFolderPath;
  }

  copyFileToCategory(sourceFilePath, categoryName, targetFileName) {
    const targetFolderPath = this.getTargetFolderByCategory(categoryName);
    const destinationFilePath = path.join(targetFolderPath, targetFileName);
    fs.copyFileSync(sourceFilePath, destinationFilePath);
    return destinationFilePath;
  }

  registerAssetFromFile(sourceFilePath, {
    category,
    tagSeed,
    sourceRunId,
    sourcePhase,
    iteration,
    verdict,
    originalFileName,
  } = {}) {
    const effectiveFileName = originalFileName || path.basename(sourceFilePath);
    const mimeType = this.getMimeTypeFromFileName(effectiveFileName);
    const tagId = this.createUniqueTagId(tagSeed || effectiveFileName);
    const destinationFilePath = this.copyFileToCategory(sourceFilePath, category, `${tagId}${path.extname(effectiveFileName)}`);
    const fileStat = fs.statSync(destinationFilePath);

    return this.assetStore.createAsset({
      tagId,
      fileName: effectiveFileName,
      filePath: destinationFilePath,
      mimeType,
      fileSize: fileStat.size,
      category,
      sourceRunId,
      sourcePhase,
      iteration,
      verdict,
    });
  }

  listAssets({ category, queryText } = {}) {
    return this.assetStore.listAssets().filter((assetItem) => {
      const categoryMatches = category ? assetItem.category === category : true;
      const queryMatches = queryText
        ? assetItem.fileName.toLowerCase().includes(queryText.toLowerCase()) || assetItem.tagId.toLowerCase().includes(queryText.toLowerCase())
        : true;
      return categoryMatches && queryMatches;
    });
  }

  getAssetById(assetId) {
    return this.assetStore.getAsset(assetId);
  }

  updateAsset(assetId, updateFields) {
    const currentAsset = this.getAssetById(assetId);
    if (!currentAsset) {
      throw new Error("Asset not found");
    }

    const nextTagId = updateFields.tagId ? this.sanitizeTagSeed(updateFields.tagId) : currentAsset.tagId;
    if (nextTagId !== currentAsset.tagId) {
      const duplicateAsset = this.assetStore.getByTagId(nextTagId);
      if (duplicateAsset && duplicateAsset.id !== assetId) {
        throw new Error("이미 사용 중인 tagId입니다.");
      }
    }

    return this.assetStore.updateAsset(assetId, {
      tagId: nextTagId,
      fileName: updateFields.fileName || currentAsset.fileName,
      verdict: updateFields.verdict ?? currentAsset.verdict,
      sourceRunId: updateFields.sourceRunId ?? currentAsset.sourceRunId,
      sourcePhase: updateFields.sourcePhase ?? currentAsset.sourcePhase,
      iteration: updateFields.iteration ?? currentAsset.iteration,
    });
  }

  deleteAsset(assetId) {
    const deletedAsset = this.assetStore.deleteAsset(assetId);
    if (deletedAsset && fs.existsSync(deletedAsset.filePath)) {
      fs.unlinkSync(deletedAsset.filePath);
    }
    return deletedAsset;
  }

  resolveTag(tagId) {
    const assetItem = this.assetStore.getByTagId(tagId);
    if (!assetItem) {
      throw new Error(`Asset tag를 찾을 수 없습니다: @${tagId}`);
    }
    return assetItem;
  }

  resolvePrompt(promptText) {
    const tagPattern = /@([a-zA-Z0-9_가-힣]+)/g;
    const foundTagIds = [...promptText.matchAll(tagPattern)].map((matchItem) => matchItem[1]);
    const uniqueTagIds = [...new Set(foundTagIds)];
    const unresolvedTags = [];
    const attachmentItems = [];
    let resolvedText = promptText;

    uniqueTagIds.forEach((tagId) => {
      const matchedAsset = this.assetStore.getByTagId(tagId);
      if (!matchedAsset) {
        unresolvedTags.push(tagId);
        return;
      }
      resolvedText = resolvedText.replaceAll(`@${tagId}`, matchedAsset.fileName);
      attachmentItems.push({
        tagId,
        assetId: matchedAsset.id,
        filePath: matchedAsset.filePath,
        mimeType: matchedAsset.mimeType,
      });
    });

    return {
      resolvedText,
      attachments: attachmentItems,
      unresolvedTags,
    };
  }

  buildGeminiPartsFromPrompt(promptText) {
    const resolvedPrompt = this.resolvePrompt(promptText);
    if (resolvedPrompt.unresolvedTags.length > 0) {
      throw new Error(`리졸브 실패 태그: ${resolvedPrompt.unresolvedTags.join(", ")}`);
    }

    const attachmentParts = resolvedPrompt.attachments.map((attachmentItem) => ({
      inline_data: {
        mime_type: attachmentItem.mimeType,
        data: fs.readFileSync(attachmentItem.filePath).toString("base64"),
      },
    }));

    return {
      resolvedText: resolvedPrompt.resolvedText,
      parts: [{ text: resolvedPrompt.resolvedText }, ...attachmentParts],
      attachments: resolvedPrompt.attachments,
    };
  }
}

module.exports = { AssetService };
