// build.gradle.kts (Module: app)
// ChefAgent Kitchen Kiosk - Master Gradle Configuration

plugins {
    alias(libs.plugins.android.application)
    alias(libs.plugins.kotlin.compose)
    alias(libs.plugins.google.devtools.ksp)
    kotlin("plugin.serialization") version "2.2.10"
}

android {
    namespace = "com.agency.chefagent"
    compileSdk = 36

    defaultConfig {
        applicationId = "com.agency.chefagent"
        minSdk = 26
        targetSdk = 36
        versionCode = 2
        versionName = "2.0.0"

        testInstrumentationRunner = "androidx.test.runner.AndroidJUnitRunner"

        ndk {
            abiFilters += listOf("armeabi-v7a", "arm64-v8a", "x86", "x86_64")
        }
    }

    buildFeatures {
        compose = true
        buildConfig = true
    }

    compileOptions {
        sourceCompatibility = JavaVersion.VERSION_17
        targetCompatibility = JavaVersion.VERSION_17
    }

    kotlinOptions {
        jvmTarget = "17"
        freeCompilerArgs += listOf(
            "-opt-in=kotlinx.coroutines.ExperimentalCoroutinesApi",
            "-opt-in=androidx.compose.material3.ExperimentalMaterial3Api"
        )
    }

    packaging {
        resources {
            excludes += listOf(
                "/META-INF/{AL2.0,LGPL2.1}",
                "META-INF/INDEX.LIST",
                "META-INF/io.netty.versions.properties"
            )
        }
    }
}

dependencies {
    val ktorVersion = "2.3.12"
    val roomVersion = "2.7.0"
    val moshiVersion = "1.15.2"

    // ========================================================================
    // 1. KTOR EMBEDDED SERVER & WEBSOCKET ENGINE (P2P Mesh Network)
    // ========================================================================
    implementation("io.ktor:ktor-server-core:$ktorVersion")
    implementation("io.ktor:ktor-server-cio:$ktorVersion")
    implementation("io.ktor:ktor-server-websockets:$ktorVersion")
    implementation("io.ktor:ktor-server-content-negotiation:$ktorVersion")
    implementation("io.ktor:ktor-serialization-kotlinx-json:$ktorVersion")

    // Ktor Client for outgoing P2P WebSocket peering to discovered kiosks
    implementation("io.ktor:ktor-client-core:$ktorVersion")
    implementation("io.ktor:ktor-client-cio:$ktorVersion")
    implementation("io.ktor:ktor-client-websockets:$ktorVersion")
    implementation("io.ktor:ktor-client-content-negotiation:$ktorVersion")

    // ========================================================================
    // 2. CRYPTOGRAPHIC SECURE HASHING (Argon2 & Bcrypt for Manager PINs)
    // ========================================================================
    // BCrypt for salted 4-digit PIN derivation with work factor 12
    implementation("at.favre.lib:bcrypt:0.10.2")

    // Optional Argon2Kt library for memory-hard key derivation
    // implementation("com.lambdapioneer.argon2kt:argon2kt:1.6.0")

    // AndroidX Security for EncryptedSharedPreferences (Hardware-backed KeyStore)
    implementation("androidx.security:security-crypto:1.1.0-alpha06")

    // ========================================================================
    // 3. JETPACK COMPOSE, CORE SPLASH SCREEN & NAVIGATION
    // ========================================================================
    implementation(platform("androidx.compose:compose-bom:2024.09.00"))
    implementation("androidx.compose.ui:ui")
    implementation("androidx.compose.material3:material3")
    implementation("androidx.compose.material:material-icons-extended")
    implementation("androidx.compose.ui:ui-tooling-preview")
    implementation("androidx.navigation:navigation-compose:2.8.9")
    implementation("androidx.activity:activity-compose:1.10.1")
    implementation("androidx.lifecycle:lifecycle-viewmodel-compose:2.8.7")
    implementation("androidx.lifecycle:lifecycle-runtime-compose:2.8.7")

    // Jetpack Core Splash Screen for startup database synchronization gating
    implementation("androidx.core:core-splashscreen:1.0.1")

    // ========================================================================
    // 4. ROOM PERSISTENCE & SQLITE WRITE-AHEAD LOGGING (WAL)
    // ========================================================================
    implementation("androidx.room:room-runtime:$roomVersion")
    implementation("androidx.room:room-ktx:$roomVersion")
    ksp("androidx.room:room-compiler:$roomVersion")

    // ========================================================================
    // 5. COROUTINES & FLOW CONCURRENCY
    // ========================================================================
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-core:1.10.2")
    implementation("org.jetbrains.kotlinx:kotlinx-coroutines-android:1.10.2")

    // ========================================================================
    // 6. JSON SERIALIZATION (Moshi & KotlinX Serialization)
    // ========================================================================
    implementation("com.squareup.moshi:moshi-kotlin:$moshiVersion")
    ksp("com.squareup.moshi:moshi-kotlin-codegen:$moshiVersion")
    implementation("org.jetbrains.kotlinx:kotlinx-serialization-json:1.7.3")

    // Testing
    testImplementation("junit:junit:4.13.2")
    testImplementation("org.jetbrains.kotlinx:kotlinx-coroutines-test:1.10.2")
    testImplementation("androidx.room:room-testing:$roomVersion")
}
