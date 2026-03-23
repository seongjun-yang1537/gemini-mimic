// Generated under Codex compliance with AGENTS.md (gemini-mimic)
const fs = require("node:fs");
const path = require("node:path");
const { randomUUID } = require("node:crypto");

class AssetStore {
  constructor(storagePath) {
    this.storagePath = path.resolve(storagePath || "./outputs/assets.json");
    fs.mkdirSync(path.dirname(this.storagePath), { recursive: true });
    if (!fs.existsSync(this.storagePath)) {
      fs.writeFileSync(this.storagePath, JSON.stringify([], null, 2), "utf8");
    }
  }

  readAssets() {
    const jsonText = fs.readFileSync(this.storagePath, "utf8");
    return JSON.parse(jsonText);
  }

  saveAssets(assetList) {
    fs.writeFileSync(this.storagePath, JSON.stringify(assetList, null, 2), "utf8");
  }

  createAsset(assetPayload) {
    const assetList = this.readAssets();
    const nowIsoString = new Date().toISOString();
    const storedAsset = {
      id: randomUUID(),
      ...assetPayload,
      createdAt: nowIsoString,
      updatedAt: nowIsoString,
    };
    assetList.unshift(storedAsset);
    this.saveAssets(assetList);
    return storedAsset;
  }

  updateAsset(assetId, updates) {
    const assetList = this.readAssets();
    const targetIndex = assetList.findIndex((asset) => asset.id === assetId);
    if (targetIndex === -1) {
      throw new Error("Asset not found");
    }
    assetList[targetIndex] = {
      ...assetList[targetIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
    };
    this.saveAssets(assetList);
    return assetList[targetIndex];
  }

  getAsset(assetId) {
    return this.readAssets().find((asset) => asset.id === assetId);
  }

  listAssets() {
    return this.readAssets();
  }

  getByTagId(tagId) {
    return this.readAssets().find((asset) => asset.tagId === tagId);
  }

  deleteAsset(assetId) {
    const assetList = this.readAssets();
    const targetAsset = assetList.find((asset) => asset.id === assetId);
    const filteredAssets = assetList.filter((asset) => asset.id !== assetId);
    this.saveAssets(filteredAssets);
    return targetAsset;
  }
}

module.exports = { AssetStore };
