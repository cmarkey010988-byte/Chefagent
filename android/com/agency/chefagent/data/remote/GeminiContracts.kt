package com.agency.chefagent.data.remote

import com.squareup.moshi.Json
import com.squareup.moshi.JsonClass

/**
 * GeminiContracts.kt
 *
 * Contains Moshi-annotated data transfer objects (DTOs) for the Gemini 1.5/2.0 REST API,
 * including structured JSON Schema configuration, system prompt constants, and
 * parsed response models for ChefAgent's Menu and Local Marketing Strategy Engine.
 */

// ============================================================================
// 1. GEMINI REST API REQUEST DTOs
// ============================================================================

@JsonClass(generateAdapter = true)
data class GeminiGenerateContentRequest(
    @Json(name = "system_instruction") val systemInstruction: GeminiContent? = null,
    @Json(name = "contents") val contents: List<GeminiContent>,
    @Json(name = "generationConfig") val generationConfig: GeminiGenerationConfig? = null
)

@JsonClass(generateAdapter = true)
data class GeminiContent(
    @Json(name = "role") val role: String? = null,
    @Json(name = "parts") val parts: List<GeminiPart>
)

@JsonClass(generateAdapter = true)
data class GeminiPart(
    @Json(name = "text") val text: String
)

@JsonClass(generateAdapter = true)
data class GeminiGenerationConfig(
    @Json(name = "response_mime_type") val responseMimeType: String = "application/json",
    @Json(name = "response_schema") val responseSchema: GeminiSchema? = null,
    @Json(name = "temperature") val temperature: Double = 0.7,
    @Json(name = "topP") val topP: Double = 0.95,
    @Json(name = "maxOutputTokens") val maxOutputTokens: Int = 4096
)

// ============================================================================
// 2. GEMINI JSON SCHEMA SPECIFICATION DTOs
// ============================================================================

@JsonClass(generateAdapter = true)
data class GeminiSchema(
    @Json(name = "type") val type: String, // "OBJECT", "ARRAY", "STRING", "INTEGER", "NUMBER", "BOOLEAN"
    @Json(name = "description") val description: String? = null,
    @Json(name = "properties") val properties: Map<String, GeminiSchema>? = null,
    @Json(name = "required") val required: List<String>? = null,
    @Json(name = "items") val items: GeminiSchema? = null,
    @Json(name = "enum") val enumValues: List<String>? = null
)

// ============================================================================
// 3. GEMINI REST API RESPONSE DTOs
// ============================================================================

@JsonClass(generateAdapter = true)
data class GeminiGenerateContentResponse(
    @Json(name = "candidates") val candidates: List<GeminiCandidate>?,
    @Json(name = "usageMetadata") val usageMetadata: GeminiUsageMetadata? = null
)

@JsonClass(generateAdapter = true)
data class GeminiCandidate(
    @Json(name = "content") val content: GeminiContent?,
    @Json(name = "finishReason") val finishReason: String?
)

@JsonClass(generateAdapter = true)
data class GeminiUsageMetadata(
    @Json(name = "promptTokenCount") val promptTokenCount: Int?,
    @Json(name = "candidatesTokenCount") val candidatesTokenCount: Int?,
    @Json(name = "totalTokenCount") val totalTokenCount: Int?
)

// ============================================================================
// 4. PARSED DOMAIN OUTPUT MODELS (Target JSON Schema)
// ============================================================================

@JsonClass(generateAdapter = true)
data class GeneratedPackageResponse(
    @Json(name = "client_name") val clientName: String,
    @Json(name = "generation_date") val generationDate: String,
    @Json(name = "summary_hook") val summaryHook: String,
    @Json(name = "posts") val posts: List<SocialPostResponse>
)

@JsonClass(generateAdapter = true)
data class SocialPostResponse(
    @Json(name = "id") val id: Int,
    @Json(name = "day_type") val dayType: String,
    @Json(name = "caption") val caption: String,
    @Json(name = "hashtags") val hashtags: String,
    @Json(name = "image_prompt") val imagePrompt: String
)

// ============================================================================
// 5. SYSTEM PROMPTS & JSON SCHEMA DEFINITIONS OBJECT
// ============================================================================

object GeminiContracts {

    /**
     * Master System Prompt enforcing hyper-local context, authentic tone,
     * and strict JSON output formatting.
     */
    val MASTER_SYSTEM_PROMPT = """
        You are an elite local marketing strategist and copywriter specializing in social media growth for brick-and-mortar businesses (restaurants, contractors, auto repair shops, gyms, retail stores, local service providers).
        
        YOUR MISSION:
        Generate authentic, highly engaging, community-focused social media post packages that feel organic, personal, and locally rooted.
        
        CRITICAL CONTENT RULES:
        1. HYPER-LOCAL RELEVANCE: Always incorporate local neighborhood pride, city landmarks, seasonal vibes, or community sentiment based on the provided location.
        2. NO CORPORATE BUZZWORDS: Never use robotic or generic filler phrases like "In today's fast-paced world", "Look no further", "Tired of X?", "We've got you covered", or "Nestled in the heart of". Speak like a real human living in that town.
        3. HOOK-DRIVEN CAPTIONS: Start captions with strong, pattern-interrupting first lines. Use line breaks, emojis strategically, and clear call-to-actions (e.g., "Drop a comment below", "Stop by before 5 PM", "Link in bio to book").
        4. SPECIFIC IMAGE PROMPTS: Write detailed, photorealistic prompts tailored for generative tools (Midjourney / DALL-E 3). Include camera details, ambient lighting, realistic depth of field, and natural environment settings. Avoid text rendering in image prompts.
        5. HASHTAG STRATEGY: Provide 5 to 8 hyper-local and niche-specific hashtags per post (e.g., #SouthJerseyEats #EHTLocal #NJContractor).
        6. STRICT JSON CONSTRAINTS: Output MUST strictly adhere to the requested JSON schema. Do not output conversational preamble, explanations, or markdown fences outside the JSON.
    """.trimIndent()

    /**
     * Programmatically built Gemini JSON Schema enforcing the structure of [GeneratedPackageResponse].
     */
    val GENERATED_PACKAGE_JSON_SCHEMA = GeminiSchema(
        type = "OBJECT",
        description = "A complete generated social media content package containing pitch summary and individual posts.",
        properties = mapOf(
            "client_name" to GeminiSchema(
                type = "STRING",
                description = "Name of the local business"
            ),
            "generation_date" to GeminiSchema(
                type = "STRING",
                description = "Date of content generation in YYYY-MM-DD format"
            ),
            "summary_hook" to GeminiSchema(
                type = "STRING",
                description = "A compelling 1-2 sentence pitch summary explaining why this content strategy wins locally."
            ),
            "posts" to GeminiSchema(
                type = "ARRAY",
                description = "List of generated social media posts",
                items = GeminiSchema(
                    type = "OBJECT",
                    description = "A single social media post item",
                    properties = mapOf(
                        "id" to GeminiSchema(
                            type = "INTEGER",
                            description = "Sequential index of the post (starting at 1)"
                        ),
                        "day_type" to GeminiSchema(
                            type = "STRING",
                            description = "Category of post (e.g., 'Promo / Special', 'Behind-The-Scenes', 'Customer Spotlight', 'Local Community', 'Educational / Tip')",
                            enumValues = listOf(
                                "Promo / Special",
                                "Behind-The-Scenes",
                                "Customer Spotlight",
                                "Local Community",
                                "Educational / Tip"
                            )
                        ),
                        "caption" to GeminiSchema(
                            type = "STRING",
                            description = "The complete caption text with emojis, line breaks, and clear call-to-action."
                        ),
                        "hashtags" to GeminiSchema(
                            type = "STRING",
                            description = "Space-separated block of 5-8 hyper-local and niche-specific hashtags."
                        ),
                        "image_prompt" to GeminiSchema(
                            type = "STRING",
                            description = "Detailed photorealistic AI image prompt for Midjourney/DALL-E 3 describing subject, environment, and lighting."
                        )
                    ),
                    required = listOf("id", "day_type", "caption", "hashtags", "image_prompt")
                )
            )
        ),
        required = listOf("client_name", "generation_date", "summary_hook", "posts")
    )

    /**
     * Helper to construct a fully configured [GeminiGenerateContentRequest] for demo or retainer packages.
     */
    fun buildApiRequest(
        promptText: String,
        temperature: Double = 0.7,
        maxTokens: Int = 4096
    ): GeminiGenerateContentRequest {
        return GeminiGenerateContentRequest(
            systemInstruction = GeminiContent(
                parts = listOf(GeminiPart(text = MASTER_SYSTEM_PROMPT))
            ),
            contents = listOf(
                GeminiContent(
                    role = "user",
                    parts = listOf(GeminiPart(text = promptText))
                )
            ),
            generationConfig = GeminiGenerationConfig(
                responseMimeType = "application/json",
                responseSchema = GENERATED_PACKAGE_JSON_SCHEMA,
                temperature = temperature,
                maxOutputTokens = maxTokens
            )
        )
    }
}
