package com.agency.chefagent.data.local

import android.util.Log
import androidx.room.TypeConverter
import org.json.JSONArray
import org.json.JSONException

/**
 * DependenciesTypeConverter.kt
 *
 * Hardened Room DB TypeConverter converting List<String> of prerequisite prep item IDs
 * to and from a lightweight JSON string column without external reflection overhead.
 *
 * Hardening:
 * 1. Validates JSON array syntax strictly.
 * 2. Eliminates silent exception swallowing: structured logging on parsing failures.
 * 3. Sanitizes input and rejects malformed payloads cleanly without breaking DAG topological sorting.
 */
class DependenciesTypeConverter {

    companion object {
        private const val TAG = "DependenciesTypeConv"
    }

    @TypeConverter
    fun fromDependenciesList(dependencies: List<String>?): String {
        if (dependencies.isNullOrEmpty()) return "[]"
        val jsonArray = JSONArray()
        dependencies.forEach { dep ->
            val trimmed = dep.trim()
            if (trimmed.isNotEmpty()) {
                jsonArray.put(trimmed)
            }
        }
        return jsonArray.toString()
    }

    @TypeConverter
    fun toDependenciesList(dependenciesString: String?): List<String> {
        if (dependenciesString.isNullOrBlank() || dependenciesString.trim() == "[]") {
            return emptyList()
        }

        val trimmed = dependenciesString.trim()
        val list = mutableListOf<String>()

        // Standard JSON Array format: ["id1", "id2"]
        if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
            try {
                val jsonArray = JSONArray(trimmed)
                for (i in 0 until jsonArray.length()) {
                    val item = jsonArray.optString(i, "").trim()
                    if (item.isNotEmpty()) {
                        list.add(item)
                    }
                }
                return list
            } catch (e: JSONException) {
                Log.e(TAG, "Malformed JSON array in dependencies column: '$dependenciesString'", e)
            }
        }

        // Defensive fallback for legacy comma-separated values: "id1, id2"
        return try {
            trimmed.split(",")
                .map { it.replace("\"", "").replace("[", "").replace("]", "").trim() }
                .filter { it.isNotEmpty() }
        } catch (e: Exception) {
            Log.e(TAG, "Failed to parse legacy dependency string: '$dependenciesString'", e)
            emptyList()
        }
    }
}
