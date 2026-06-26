const { resolveSelectedAccount } = require("../adapters/channel/weixin/account-store");
const { loadPersistedContextTokens } = require("../adapters/channel/weixin/context-token-store");
const { resolvePreferredSenderId } = require("../core/default-targets");

class ChannelTextService {
  constructor({ config, channelAdapter, sessionStore }) {
    this.config = config;
    this.channelAdapter = channelAdapter;
    this.sessionStore = sessionStore;
  }

  async sendToCurrentChat({ text = "", userId = "" } = {}, context = {}) {
    const normalizedText = normalizeText(text);
    if (!normalizedText) {
      throw new Error("channel text send requires text");
    }

    const account = resolveSelectedAccount(this.config);
    const targetUserId = normalizeText(userId)
      || normalizeText(context?.senderId)
      || resolvePreferredSenderId({
        config: this.config,
        accountId: account.accountId,
        sessionStore: this.sessionStore,
      });
    if (!targetUserId) {
      throw new Error("Cannot determine which WeChat user should receive the text.");
    }

    const contextTokens = loadPersistedContextTokens(this.config, account.accountId);
    const contextToken = normalizeText(contextTokens[targetUserId]);
    if (!contextToken) {
      throw new Error(`Cannot find a context token for user ${targetUserId}. Let this user talk to the bot once first.`);
    }

    await this.channelAdapter.sendText({
      userId: targetUserId,
      text: normalizedText,
      contextToken,
      preserveBlock: true,
    });
    return { userId: targetUserId, text: normalizedText };
  }
}

function normalizeText(value) {
  return typeof value === "string" ? value.trim() : "";
}

module.exports = { ChannelTextService };
