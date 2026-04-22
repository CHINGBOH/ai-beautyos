const devJwtSecret = "dev-jwt-secret-at-least-32-characters-long";
export const ENV = {
  appId: process.env.VITE_APP_ID ?? "",
  cookieSecret:
    process.env.JWT_SECRET && process.env.JWT_SECRET.length >= 32
      ? process.env.JWT_SECRET
      : process.env.NODE_ENV === "production"
        ? ""
        : devJwtSecret,
  databaseUrl: process.env.DATABASE_URL ?? "",
  oAuthServerUrl: process.env.OAUTH_SERVER_URL ?? "",
  ownerOpenId: process.env.OWNER_OPEN_ID ?? "",
  isProduction: process.env.NODE_ENV === "production",
  /** DeepSeek：.env 中配置 DEEPSEEK_API_KEY 后，职能助手等使用本 LLM 的功能会走 DeepSeek */
  deepseekApiKey: process.env.DEEPSEEK_API_KEY ?? "",
  deepseekApiUrl:
    process.env.DEEPSEEK_API_URL ??
    "https://api.deepseek.com/v1/chat/completions",
  forgeApiUrl: process.env.BUILT_IN_FORGE_API_URL ?? "",
  forgeApiKey: process.env.BUILT_IN_FORGE_API_KEY ?? "",
  disableAuth: process.env.DISABLE_AUTH === "1",
  /** 火山方舟：生文=豆包思考模型，生图=Seedream。方式一：VOLC_ARK_API_KEY + 接入点/模型；方式二：AK/SK + 接入点 ID 自动换临时 Key */
  volcArkApiKey: process.env.VOLC_ARK_API_KEY ?? "",
  /** 生文：推理接入点 ID（ep-xxx，用于豆包/doubao-seed-1-6-thinking）*/
  volcArkModel:
    process.env.VOLC_ARK_MODEL ?? process.env.VOLC_ARK_TEXT_MODEL ?? "",
  /** 生图：模型名，默认 doubao-seedream-5-0（方舟）或 high_aes_t2i（智能绘图） */
  volcArkImageModel: process.env.VOLC_ARK_IMAGE_MODEL ?? "doubao-seedream-5-0",
  /** 生图 API：ark=方舟 Seedream，visual=智能绘图服务 CVProcess（仅 AK/SK） */
  volcImageApi:
    (process.env.VOLC_IMAGE_API ?? "ark").toLowerCase() === "visual"
      ? "visual"
      : "ark",
  volcAccessKeyId: process.env.VOLC_ACCESS_KEY_ID ?? "",
  volcSecretAccessKey: process.env.VOLC_SECRET_ACCESS_KEY ?? "",
};
