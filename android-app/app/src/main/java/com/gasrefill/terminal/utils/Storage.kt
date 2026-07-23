package com.gasrefill.terminal.utils

import android.content.Context
import android.content.SharedPreferences
import com.gasrefill.terminal.models.*
import kotlinx.serialization.encodeToString
import kotlinx.serialization.json.Json

object Storage {
    private const val PREFS_NAME = "gasrefill_prefs"
    private const val KEY_GSP = "gsp"
    private const val KEY_HISTORY = "history"
    private const val KEY_BOTTLES = "bottles"
    private const val KEY_EXPENSES = "expenses"
    private const val KEY_SETTINGS = "settings"
    private const val KEY_COST_PRICE = "cost_price"
    private const val KEY_THEME = "theme"

    private val json = Json {
        ignoreUnknownKeys = true
        prettyPrint = true
    }

    private fun prefs(context: Context): SharedPreferences =
        context.getSharedPreferences(PREFS_NAME, Context.MODE_PRIVATE)

    // GSP
    fun loadGsp(context: Context, fallback: String = "1700"): String {
        return prefs(context).getString(KEY_GSP, fallback) ?: fallback
    }

    fun saveGsp(context: Context, value: String) {
        prefs(context).edit().putString(KEY_GSP, value).apply()
    }

    // History
    fun loadHistory(context: Context): List<Transaction> {
        val raw = prefs(context).getString(KEY_HISTORY, null) ?: return emptyList()
        return try {
            json.decodeFromString<List<Transaction>>(raw)
        } catch (e: Exception) {
            emptyList()
        }
    }

    fun saveHistory(context: Context, transactions: List<Transaction>) {
        prefs(context).edit().putString(KEY_HISTORY, json.encodeToString(transactions)).apply()
    }

    // Bottles
    fun loadBottles(context: Context): List<Bottle> {
        val raw = prefs(context).getString(KEY_BOTTLES, null) ?: return emptyList()
        return try {
            json.decodeFromString<List<Bottle>>(raw)
        } catch (e: Exception) {
            emptyList()
        }
    }

    fun saveBottles(context: Context, bottles: List<Bottle>) {
        prefs(context).edit().putString(KEY_BOTTLES, json.encodeToString(bottles)).apply()
    }

    // Expenses
    fun loadExpenses(context: Context): List<Expense> {
        val raw = prefs(context).getString(KEY_EXPENSES, null) ?: return emptyList()
        return try {
            json.decodeFromString<List<Expense>>(raw)
        } catch (e: Exception) {
            emptyList()
        }
    }

    fun saveExpenses(context: Context, expenses: List<Expense>) {
        prefs(context).edit().putString(KEY_EXPENSES, json.encodeToString(expenses)).apply()
    }

    // Settings
    fun loadSettings(context: Context): BusinessSettings? {
        val raw = prefs(context).getString(KEY_SETTINGS, null) ?: return null
        return try {
            json.decodeFromString<BusinessSettings>(raw)
        } catch (e: Exception) {
            null
        }
    }

    fun saveSettings(context: Context, settings: BusinessSettings) {
        prefs(context).edit().putString(KEY_SETTINGS, json.encodeToString(settings)).apply()
    }

    // Cost Price
    fun loadCostPrice(context: Context, fallback: String = "0"): String {
        return prefs(context).getString(KEY_COST_PRICE, fallback) ?: fallback
    }

    fun saveCostPrice(context: Context, value: String) {
        prefs(context).edit().putString(KEY_COST_PRICE, value).apply()
    }

    // Theme
    fun loadTheme(context: Context): String? = prefs(context).getString(KEY_THEME, null)
    fun saveTheme(context: Context, theme: String) {
        prefs(context).edit().putString(KEY_THEME, theme).apply()
    }

    // Clear all
    fun clearAll(context: Context) {
        prefs(context).edit().clear().apply()
    }
}
