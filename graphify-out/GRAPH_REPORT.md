# Graph Report - CarryGo  (2026-11-08)

## Corpus Check
- Large corpus: 504 files · ~408,465 words. Semantic extraction will be expensive (many Claude tokens). Consider running on a subfolder.

## Summary
- 2299 nodes · 7724 edges · 106 communities (101 shown, 5 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS · INFERRED: 21 edges (avg confidence: 0.85)
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- Email Services Templates
- Components Feature Microinteractions
- Components Feature Styles
- Package Json React
- Components Feature Service
- Components Feature Lottieviewwrapper
- Service Services Parcels
- Components Feature Styles
- Support Services Service
- Notifications Service Services
- Conversations Queries Features
- Services Smart Matching
- Service Services Storage
- Images Queries Parcel
- Yml Github Workflows
- Components Expressionstarrating Feature
- Tabs Components Profile
- Service Services Requests
- Services Service Payments
- Supabase Functions Razorpay
- Legal Styles Policy
- Requests Activity Features
- Rewards Services Service
- Components Feature Deliverymap
- Components Feature Trip
- Service Services Secure
- Contexts Layout Notificationcontext
- Components Feature Livemarketplaceheader
- Components Feature Sevendayschedulepicker
- Profile Kyc Services
- Verify Mjs Scripts
- Search Components Feature
- Components Trusttierbadge Card
- Components Trip Feature
- Service Services Conversations
- Messages Tabs Dateformat
- Template Context Constants
- Package Json Eslint
- Kyc Service Services
- Core Template Configmanager
- Cities Indian Constants
- Hooks Route Intelligence
- Illustrations Components Categoryillustrations
- Payment Apperrorboundary Components
- Promotionalbannercarousel Components Feature
- Services Service Route
- Components Feature Matchinghelpers
- Components Feature Requestcard
- Monitoring Test Capturemessage
- Package Json Test
- Useanimations Hooks Usebreathing
- Rate Limiter Useratelimiter
- Error Handler Useretryableaction
- Safetyonboarding Components Feature
- Parcel Components Feature
- Content Legal Bilingual
- Notifications Usenotifications Services
- Price Estimator Services
- Test Aws Upload
- Json Typedroutes Expo
- Onboarding Productillustration Components
- Tabs Layout Useresponsive
- Subscriptions Service Services
- Components Feature Stepindicator
- Corridors Service Services
- Error Handler Auth
- Usenetworkstatus Hooks React
- Crypto Test Gamma0
- Parcelvision Test Aiclassificationresult
- Database Template Core
- Updates Service Services
- Package Json Usesavedroutes
- Json Backgroundcolor Foregroundimage
- Useroutemap Hooks Indiancity
- Avatar Enrichment Services
- Blablahelpers Components Feature
- Aws Signing Bucketconfig
- Filesecurity Image Allowed
- Json Ios Bundleidentifier
- Price Calculateearnings Category
- Face Verification Test
- Reset Production Mjs
- Package Json Yaml
- Animatedicon Components Test
- Error Messages Constants
- Api Aws Awsapierror
- Smartvalidation Validateaadhaar Validatedeliveryprice
- Tsconfig Json Expo
- Face Verification Service
- Json Backgroundcolor Image
- Useformdraft Hooks Test
- Analytics Service Services
- Json Cfbundledisplayname Cfbundlename
- Retry Queryclient Query
- Package Json Exclude
- React Native Razorpay
- Json Web Bundler
- Tripcard Components Feature
- Timing Constants Animation
- Metro Expo Package
- Json Projectid Extra
- Json Updates Checkautomatically
- Test Sandbox Assets

## God Nodes (most connected - your core abstractions)
1. `useThemeColors()` - 198 edges
2. `getSharedSupabaseClient()` - 176 edges
3. `react` - 146 edges
4. `react-native` - 137 edges
5. `Spacing` - 106 edges
6. `FontWeight` - 101 edges
7. `BorderRadius` - 101 edges
8. `FontSize` - 100 edges
9. `@expo/vector-icons` - 100 edges
10. `Haptic` - 83 edges

## Surprising Connections (you probably didn't know these)
- `RouteMapView` --calls--> `useThemeColors()`  [EXTRACTED]
  components/feature/RouteMapView.web.tsx → hooks/useThemeColors.ts
- `MatchTripsParams` --references--> `Parcel`  [EXTRACTED]
  hooks/useMatching.ts → types/index.ts
- `MatchParcelsParams` --references--> `Trip`  [EXTRACTED]
  hooks/useMatching.ts → types/index.ts
- `fetchUserStats()` --calls--> `getSharedSupabaseClient()`  [EXTRACTED]
  services/analytics.service.ts → template/core/client.ts
- `fetchUserActivityTimeline()` --calls--> `getSharedSupabaseClient()`  [EXTRACTED]
  services/analytics.service.ts → template/core/client.ts

## Import Cycles
- None detected.

## Communities (106 total, 5 thin omitted)

### Community 0 - "Email Services Templates"
Cohesion: 0.06
Nodes (85): exampleDirPath, fs, oldDirs, path, readline, rl, root, args (+77 more)

### Community 1 - "Components Feature Microinteractions"
Cohesion: 0.04
Nodes (72): AdvancedFilterModal(), AdvancedFilterModalProps, AdvancedFilterState, CAPACITY_OPTIONS, countActiveFilters(), DATE_WINDOWS, DEFAULT_FILTERS, modalStyles (+64 more)

### Community 2 - "Components Feature Styles"
Cohesion: 0.07
Nodes (54): IndexPage(), styles, Step, styles, styles, VEHICLE_ICONS, styles, VEHICLE_OPTIONS (+46 more)

### Community 3 - "Package Json React"
Cohesion: 0.04
Nodes (69): dependencies, expo-application@~6.1.4, expo-build-properties@~0.14.8, expo-file-system@~18.1.11, expo-font@~13.3.2, expo-haptics@~14.1.4, expo-image@~2.4.1, expo-image-picker@^16.1.4 (+61 more)

### Community 4 - "Components Feature Service"
Cohesion: 0.07
Nodes (57): DeliveryScreen(), DeliveryScreenInner(), styles, buildOtpShareMessage(), DeliveryOtpActionCard(), DeliveryOtpCardProps, DeliverySuccessCard(), NativeSuccessCelebrationBadge() (+49 more)

### Community 5 - "Components Feature Lottieviewwrapper"
Cohesion: 0.06
Nodes (41): NotificationsScreen(), ActivityParcelsList(), ActivityParcelsListProps, CATEGORY_COLORS, CATEGORY_ICONS, EmptyActivity(), ParcelRow(), styles (+33 more)

### Community 6 - "Service Services Parcels"
Cohesion: 0.11
Nodes (35): getUnmatchedListingCutoffIso(), UNMATCHED_LISTING_EXPIRY_HOURS, PaginatedResult, useListingsRealtime(), useParcelsInfiniteQuery(), usePromotionalBannersQuery(), usePromotionalBannersRealtime(), useTripsInfiniteQuery() (+27 more)

### Community 7 - "Components Feature Styles"
Cohesion: 0.08
Nodes (32): ALL_CITY_NAMES, CityPicker(), CityPickerProps, styles, ALL_CITY_NAMES, CitySearchField(), CitySearchFieldProps, styles (+24 more)

### Community 8 - "Support Services Service"
Cohesion: 0.11
Nodes (37): BOT_KNOWLEDGE_BASE, CATEGORY_ICONS, CHATBOT_PROMPTS, ChatMessage, FAQ_ARTICLES, FaqArticle, getBotResponse(), StatusPill() (+29 more)

### Community 9 - "Notifications Service Services"
Cohesion: 0.11
Nodes (37): NotificationSettingsScreen(), PreferenceSection, PrefItem, PrefKey, styles, checkNotificationPermissions(), createNotification(), DiagnosticReport (+29 more)

### Community 10 - "Conversations Queries Features"
Cohesion: 0.11
Nodes (33): buildListItems(), ChatInputBar, ChatScreen(), getDayLabel(), ListItem, MessageBubble, QUICK_PROMPTS, styles (+25 more)

### Community 11 - "Services Smart Matching"
Cohesion: 0.10
Nodes (32): MatchDiagnosticCardProps, MatchingResult, MatchParcelsParams, MatchTripsOnRouteParams, MatchTripsParams, useMatchingParcels(), checkTripParcelRoute(), RouteCompatibilityResult (+24 more)

### Community 12 - "Service Services Storage"
Cohesion: 0.10
Nodes (34): buildCloudinaryUrl(), CLOUDINARY_CONFIG, getRawUploadUrl(), getUploadUrl(), isCloudinaryConfigured(), StorageFolder, getFileSize(), ImagePreset (+26 more)

### Community 13 - "Images Queries Parcel"
Cohesion: 0.12
Nodes (32): CATEGORY_CONFIGS, CATEGORY_GRADIENTS, CategoryConfig, ParcelDetailScreen(), ProposalCard(), HomeHeader(), ALL_PARCEL_CATEGORIES, TripDetailScreen() (+24 more)

### Community 14 - "Yml Github Workflows"
Cohesion: 0.07
Nodes (36): concurrency, cancel-in-progress, group, if, name, needs, runs-on, steps (+28 more)

### Community 15 - "Components Expressionstarrating Feature"
Cohesion: 0.07
Nodes (27): styles, getReasonTheme(), MatchDiagnosticCard(), ReasonTheme, styles, RatingModalProps, styles, AnimatedTabIndicator() (+19 more)

### Community 16 - "Tabs Components Profile"
Cohesion: 0.13
Nodes (32): SearchScreen(), DEFAULT_FILTERS, EmptyMarketplace(), FeedItem, FeedParcelItem, FeedTripItem, HomeScreen(), QuickActions() (+24 more)

### Community 17 - "Service Services Requests"
Cohesion: 0.13
Nodes (31): useCheckDuplicateRequestQuery(), BackendProvider, getBackendProvider(), isAwsBackendEnabled(), validateAmount(), validateCityName(), validateDescription(), validateEmail() (+23 more)

### Community 18 - "Services Service Payments"
Cohesion: 0.15
Nodes (28): disabledFeatureMessage, FeatureFlags, productionReady, useCreateParcelMutation(), CheckoutState, ensureRazorpayWebSdkLoaded(), useRazorpayCheckout(), UseRazorpayCheckoutOptions (+20 more)

### Community 19 - "Supabase Functions Razorpay"
Cohesion: 0.06
Nodes (9): CORS_HEADERS, CORS_HEADERS, ALLOWED_PREFIXES, ReceiptResponse, CORS_HEADERS, RazorpayEvent, CORS_HEADERS, ExpoTicket (+1 more)

### Community 20 - "Legal Styles Policy"
Cohesion: 0.16
Nodes (24): PrivacyScreen(), styles, RefundPolicyScreen(), styles, ShippingPolicyScreen(), styles, BulletList(), Paragraph() (+16 more)

### Community 21 - "Requests Activity Features"
Cohesion: 0.16
Nodes (29): ActivityTab, EarningsSummary(), groupByMonth(), MonthHeader(), MyActivityScreen(), styles, TxRow(), TxSummaryCard() (+21 more)

### Community 22 - "Rewards Services Service"
Cohesion: 0.18
Nodes (28): FilterTab, REDEEM_OPTIONS, RewardsScreen(), styles, storageSet(), applyParcelCredit(), awardDeliveryCoins(), CARYGOO_CATALOG_VOUCHERS (+20 more)

### Community 23 - "Components Feature Deliverymap"
Cohesion: 0.10
Nodes (19): ChatInputBarProps, ProposalCardProps, TabButtonProps, CityDropdownProps, styles, DeliveryMapProps, styles, DeliveryMapProps (+11 more)

### Community 24 - "Components Feature Trip"
Cohesion: 0.15
Nodes (27): CreateParcelScreen(), ALL_CATEGORIES, CreateTripScreen(), EMPTY_DRAFT, normalizeCity(), STEPS, styles, TripDraft (+19 more)

### Community 25 - "Service Services Secure"
Cohesion: 0.16
Nodes (21): AuthContext, AuthContextType, AuthProvider(), mapAuthError(), profileEmailFor(), secureClearAll(), secureDelete(), secureGet() (+13 more)

### Community 26 - "Contexts Layout Notificationcontext"
Cohesion: 0.12
Nodes (22): AppShell(), AppStack(), ErrorBoundary(), NotificationRootListener(), PUBLIC_ROUTE_ROOTS, RootLayout(), styles, UpdateBanner() (+14 more)

### Community 27 - "Components Feature Livemarketplaceheader"
Cohesion: 0.12
Nodes (23): MatchResult, BlaBlaTripCardProps, CarryParcelModalProps, CATEGORY_OPTIONS, formatCorridorLabel(), LiveMarketplaceHeaderProps, MarketplaceSortOption, sortMarketplaceParcels() (+15 more)

### Community 28 - "Components Feature Sevendayschedulepicker"
Cohesion: 0.10
Nodes (21): CitySelectModal(), CitySelectModalProps, POPULAR_HUBS, styles, HaryanaCorridorChips, HaryanaCorridorChipsProps, styles, TOP_HARYANA_CORRIDORS (+13 more)

### Community 29 - "Profile Kyc Services"
Cohesion: 0.15
Nodes (24): AVATAR_PRESETS, EditProfileScreen(), POPULAR_CITIES, styles, ACCOUNT_STEPS, AccountStep, ALL_CITIES, formatMobileInput() (+16 more)

### Community 30 - "Verify Mjs Scripts"
Cohesion: 0.08
Nodes (21): failures, migrationPaths, requiredColumns, requiredFunctions, requiredTables, sql, failures, hardeningMigration (+13 more)

### Community 31 - "Search Components Feature"
Cohesion: 0.11
Nodes (22): CITIES, FocusedField, localStyles, MatchBreakdownSheet(), POPULAR_ROUTES, ResultTab, SmartMatchesSectionProps, smStyles (+14 more)

### Community 32 - "Components Trusttierbadge Card"
Cohesion: 0.11
Nodes (19): categoryConfig, styles, styles, Card(), CardProps, styles, LivelyCard(), LivelyCardProps (+11 more)

### Community 33 - "Components Trip Feature"
Cohesion: 0.17
Nodes (20): CAPACITY_PRESETS, CARRY_CATEGORIES, CARRY_CATEGORY_IMAGES, PRICE_PRESETS, styles, TripDetailsDraft, TripDetailsStepProps, VEHICLE_IMAGES (+12 more)

### Community 34 - "Service Services Conversations"
Cohesion: 0.14
Nodes (19): escapeHtml(), sanitizeForDisplay(), sanitizeMessageText(), sanitizeTextInput(), ConversationRow, deleteConversation(), fetchMessages(), fetchMessagesPage() (+11 more)

### Community 35 - "Messages Tabs Dateformat"
Cohesion: 0.13
Nodes (20): ConversationRowItem, ConversationRowModel, formatConversationTime(), getLastTimestampValue(), MessageFilter, MessagesScreen(), safeText(), styles (+12 more)

### Community 36 - "Template Context Constants"
Cohesion: 0.18
Nodes (18): DarkColors, LightColors, AestheticAlertModal(), AestheticAlertModalProps, AlertButtonComponent(), AlertButtonComponentProps, AlertContext, AlertContextType (+10 more)

### Community 37 - "Package Json Eslint"
Cohesion: 0.09
Nodes (23): { defineConfig }, expoConfig, devDependencies, @babel/core@^7.25.2, eslint@^9.25.0, eslint-config-expo@~9.2.0, jest@^29.7.0, jest-expo@~53.0.14 (+15 more)

### Community 38 - "Kyc Service Services"
Cohesion: 0.12
Nodes (22): completeSandboxKyc(), createKycSession(), extractLast2MobileDigits(), fetchLatestKycSession(), generateAadhaarOtp(), getSandboxConfig(), getSandboxToken(), KycDocumentRow (+14 more)

### Community 39 - "Core Template Configmanager"
Cohesion: 0.15
Nodes (12): ConfigManager, configManager, createConfig(), CreateConfigOptions, AppConfig, AppError, AuthConfig, ModuleConfig (+4 more)

### Community 40 - "Cities Indian Constants"
Cohesion: 0.13
Nodes (19): CITY_ALIASES, CITY_MAP, findCitiesInRadius(), GATEWAY_MAP, getCityNames(), HARYANA_CITIES, HaryanaCity, haversineDistance() (+11 more)

### Community 41 - "Hooks Route Intelligence"
Cohesion: 0.12
Nodes (16): INDIAN_CITIES, useDebounce(), useDebouncedCallback(), useRecommendations(), DEFAULT_FILTERS, SmartSearchReturn, useThrottle(), useThrottledCallback() (+8 more)

### Community 42 - "Illustrations Components Categoryillustrations"
Cohesion: 0.16
Nodes (18): ClothingIllustration(), DocumentsIllustration(), ElectronicsIllustration(), FoodIllustration(), IllustrationProps, MedicineIllustration(), OtherIllustration(), HeroProps (+10 more)

### Community 43 - "Payment Apperrorboundary Components"
Cohesion: 0.14
Nodes (15): LoginScreen(), formatAmount(), PaymentScreen(), PaymentScreenContent(), styles, ReferralScreen(), AppErrorBoundary, DefaultErrorFallback() (+7 more)

### Community 44 - "Promotionalbannercarousel Components Feature"
Cohesion: 0.12
Nodes (18): BANNER_IMAGES, buildPromotionalSlides(), PromoSlideItem, PromotionalBannerCarouselProps, resolveBannerImage(), styles, AadhaarVerifiedAddress, DeliveryStatus (+10 more)

### Community 45 - "Services Service Route"
Cohesion: 0.15
Nodes (14): getDistance(), MarketplaceRelevanceService, areCitiesEquivalent(), calculateDirectionCosine(), checkRouteCompatibility(), isPointAlongPath(), MAX_ALLOWED_DETOUR_RATIO, MAX_DROPOFF_DISTANCE_KM (+6 more)

### Community 46 - "Components Feature Matchinghelpers"
Cohesion: 0.21
Nodes (16): SmartMatchesSection(), BlaBlaTripCard, buildRequestsByTripMap(), calculateMatchPrice(), formatMatchHeaderRoute(), formatMatchSummary(), MatchSortOption, sortMatchingTrips() (+8 more)

### Community 47 - "Components Feature Requestcard"
Cohesion: 0.16
Nodes (16): getLiveActivityPillDetails(), LiveActivityCompactPillProps, ParcelCardProps, getContextBanner(), getRequestCardViewModel(), getRouteLocations(), RequestCardProps, STATUS_CONFIG() (+8 more)

### Community 48 - "Monitoring Test Capturemessage"
Cohesion: 0.17
Nodes (18): captureMessage(), config, flushLogBuffer(), flushLogs(), getLogBuffer(), initMonitoring(), LOG_BUFFER, LogContext (+10 more)

### Community 49 - "Package Json Test"
Cohesion: 0.10
Nodes (20): scripts, android, build:web, ci, doctor, ios, lint, start (+12 more)

### Community 51 - "Rate Limiter Useratelimiter"
Cohesion: 0.14
Nodes (9): useRateLimiter(), UseRateLimiterResult, messageLimiter, paymentLimiter, RateLimitEntry, RateLimiter, RateLimiterConfig, requestLimiter (+1 more)

### Community 52 - "Error Handler Useretryableaction"
Cohesion: 0.29
Nodes (15): delay(), isTransientError(), RetryConfig, useRetryableAction(), UseRetryableActionResult, AppError, extractMessage(), handleServiceError() (+7 more)

### Community 53 - "Safetyonboarding Components Feature"
Cohesion: 0.32
Nodes (17): BulletPoint(), IconCircle(), IconName, IllustrationArea(), SafetyOnboarding(), SafetyOnboardingProps, ScenarioRow(), StepAllowedItems() (+9 more)

### Community 54 - "Parcel Components Feature"
Cohesion: 0.21
Nodes (12): STEPS, styles, EMPTY_PARCEL_DRAFT, normalizeParcelCity(), PARCEL_CATEGORIES, PARCEL_CATEGORY_IMAGES, PARCEL_OFFER_PRESETS, PARCEL_WEIGHT_PRESETS (+4 more)

### Community 55 - "Content Legal Bilingual"
Cohesion: 0.16
Nodes (14): LanguageToggleProps, DRAFT_DISCLAIMER, LEGAL_LANGUAGE_STORAGE_KEY, LegalLanguage, LegalSectionItem, PRIVACY_CONTENT, PrivacyPolicyContent, REFUND_CONTENT (+6 more)

### Community 56 - "Notifications Usenotifications Services"
Cohesion: 0.19
Nodes (16): useOptionalNotificationContext(), normalizeNotificationPayload(), NotificationPayload, seenNotificationKeys, shouldProcessNotification(), useNotifications(), expo-notifications@~0.31.2, expo-notifications (+8 more)

### Community 57 - "Price Estimator Services"
Cohesion: 0.17
Nodes (12): usePriceEstimator(), UsePriceEstimatorResult, calculateUrgency(), CATEGORY_MULTIPLIERS, estimatePrice(), PriceBreakdown, PriceEstimate, VEHICLE_MULTIPLIERS (+4 more)

### Community 58 - "Test Aws Upload"
Cohesion: 0.28
Nodes (14): assert(), CONFIG, encodeURIPath(), getSigningKey(), hmacSha256(), main(), sha256(), signPutRequest() (+6 more)

### Community 59 - "Json Typedroutes Expo"
Cohesion: 0.13
Nodes (14): typedRoutes, expo, experiments, icon, name, orientation, owner, plugins (+6 more)

### Community 60 - "Onboarding Productillustration Components"
Cohesion: 0.15
Nodes (13): ONBOARDING_KEY, OnboardingScreen(), PERSONA_OPTIONS, POPULAR_HUBS, SLIDES, styles, USER_HOME_CITY_KEY, USER_PERSONA_KEY (+5 more)

### Community 61 - "Tabs Layout Useresponsive"
Cohesion: 0.23
Nodes (11): FloatingCapsuleTabBar(), getTabMeta(), styles, TabBadge(), TabButton(), TabLayout(), TabMeta, ResponsiveContainer() (+3 more)

### Community 62 - "Subscriptions Service Services"
Cohesion: 0.27
Nodes (12): POPULAR_CORRIDORS, styles, SubCard(), SubscriptionsScreen(), checkRouteMatchSubscribers(), createSubscription(), deleteSubscription(), fetchSubscriptions() (+4 more)

### Community 63 - "Components Feature Stepindicator"
Cohesion: 0.16
Nodes (11): Dot(), KycStepIndicatorProps, styles, Step, StepIndicator(), StepIndicatorProps, styles, Step (+3 more)

### Community 64 - "Corridors Service Services"
Cohesion: 0.33
Nodes (12): findCity(), getDynamicPopularCorridors(), isPermittedCorridorCity(), isValidHaryanaDelhiCorridor(), makeCanonicalKey(), normalizeCorridorCity(), PERMITTED_GATEWAYS, PopularCorridor (+4 more)

### Community 65 - "Error Handler Auth"
Cohesion: 0.14
Nodes (14): ErrorCode, AUTH_EXPIRED, AUTH_INVALID, AUTH_UNAUTHORIZED, CONFLICT, NETWORK_OFFLINE, NETWORK_TIMEOUT, NOT_FOUND (+6 more)

### Community 66 - "Usenetworkstatus Hooks React"
Cohesion: 0.24
Nodes (11): ensureSubscribed(), getServerSnapshot(), getSnapshot(), listeners, notifyListeners(), subscribe(), useNetworkStatus(), @react-native-community/netinfo@11.4.1 (+3 more)

### Community 67 - "Crypto Test Gamma0"
Cohesion: 0.35
Nodes (11): ch(), gamma0(), gamma1(), hashAadhaarNumber(), hashPanNumber(), K, maj(), rotr() (+3 more)

### Community 68 - "Parcelvision Test Aiclassificationresult"
Cohesion: 0.23
Nodes (9): AIClassificationResult, ANGLE_SLOTS, AngleAssessment, AngleSlotConfig, AngleSlotId, assessImageAngleDiversity(), classifyParcelWithAI(), hammingDistance() (+1 more)

### Community 69 - "Database Template Core"
Cohesion: 0.17
Nodes (11): SupabaseManager, CompositeTypes, Constants, Database, DatabaseWithoutInternals, DefaultSchema, Enums, Json (+3 more)

### Community 70 - "Updates Service Services"
Cohesion: 0.35
Nodes (10): useAppUpdates(), captureException(), expo-constants@~17.1.6, expo-constants, AppVersionInfo, checkForAppUpdate(), fetchAppUpdate(), getAppVersionInfo() (+2 more)

### Community 71 - "Package Json Usesavedroutes"
Cohesion: 0.17
Nodes (9): SavedRoute, expo-secure-store@~14.2.4, @react-native-async-storage/async-storage@2.1.2, react-native-url-polyfill@^2.0.0, expo-secure-store, @react-native-async-storage/async-storage, react-native-url-polyfill, safeSupabaseOperation() (+1 more)

### Community 72 - "Json Backgroundcolor Foregroundimage"
Cohesion: 0.18
Nodes (11): backgroundColor, foregroundImage, adaptiveIcon, allowBackup, blockedPermissions, googleServicesFile, newArchEnabled, package (+3 more)

### Community 73 - "Useroutemap Hooks Indiancity"
Cohesion: 0.24
Nodes (10): IndianCity, calculateFitRegion(), clusterMarkers(), DEFAULT_REGION, getCityCoord(), MapMarker, MapPolyline, MapRegion (+2 more)

### Community 74 - "Avatar Enrichment Services"
Cohesion: 0.33
Nodes (6): avatarCache, clearAvatarCache(), fetchUserAvatars(), getCachedAvatar(), setCachedAvatar(), cancelRequest()

### Community 75 - "Blablahelpers Components Feature"
Cohesion: 0.53
Nodes (7): estimateTripDuration(), format24Hour(), formatBlaBlaPrice(), formatDurationLabel(), getRouteTimelineMeta(), parseTimeString(), RouteTimelineMeta

### Community 76 - "Aws Signing Bucketconfig"
Cohesion: 0.36
Nodes (7): BucketConfig, BucketId, getBucketConfig(), isAwsConfigured(), S3PutParams, SignedRequest, signS3PutRequest()

### Community 77 - "Filesecurity Image Allowed"
Cohesion: 0.31
Nodes (8): ALLOWED_IMAGE_EXTENSIONS, ALLOWED_IMAGE_MIME_TYPES, DEFAULT_MAX_IMAGE_SIZE_BYTES, FileValidationOptions, FileValidationResult, formatFileSize(), getFileExtension(), validateImageUpload()

### Community 78 - "Json Ios Bundleidentifier"
Cohesion: 0.22
Nodes (9): ios, bundleIdentifier, newArchEnabled, privacyManifests, supportsTablet, NSPrivacyAccessedAPITypes, NSPrivacyCollectedDataTypes, NSPrivacyTracking (+1 more)

### Community 79 - "Price Calculateearnings Category"
Cohesion: 0.22
Nodes (3): CATEGORY_BASE_RATES, PriceRange, VEHICLE_MULTIPLIER

### Community 80 - "Face Verification Test"
Cohesion: 0.31
Nodes (8): expo-image-manipulator@^13.1.7, jpeg-js@^0.4.4, expo-image-manipulator, jpeg-js, createSingleFaceJpeg(), createTwoFacesJpeg(), createValidJpeg(), fillSolid()

### Community 81 - "Reset Production Mjs"
Cohesion: 0.28
Nodes (8): @supabase/supabase-js@^2.50.0, @supabase/supabase-js, deleteViaRest(), getRowCount(), PRESERVED_EMAILS, run(), supabase, TABLES_TO_TRUNCATE

### Community 82 - "Package Json Yaml"
Cohesion: 0.22
Nodes (9): js-yaml, nanoid, on-headers, postcss, undici, uuid, ws, pnpm (+1 more)

### Community 83 - "Animatedicon Components Test"
Cohesion: 0.29
Nodes (6): ANIMATED_ICONS, AnimatedIconProps, ICON_MAP, InteractiveAnimatedIcon(), styles, VectorIconConfig

### Community 84 - "Error Messages Constants"
Cohesion: 0.25
Nodes (7): AUTH_ERRORS, ErrorMessage, GENERAL_ERRORS, NETWORK_ERRORS, PAYMENT_ERRORS, REQUEST_ERRORS, VALIDATION_ERRORS

### Community 85 - "Api Aws Awsapierror"
Cohesion: 0.50
Nodes (6): AwsApiError, awsApiRequest(), AwsApiRequestOptions, buildHeaders(), getRequiredApiBaseUrl(), normalizePath()

### Community 87 - "Tsconfig Json Expo"
Cohesion: 0.25
Nodes (7): expo/tsconfig.base, compilerOptions, paths, strict, exclude, extends, include

### Community 88 - "Face Verification Service"
Cohesion: 0.39
Nodes (7): analyzeFacialFeatures(), base64ToUint8Array(), decodeJpegToRgba(), FaceBoundingBox, FaceVerificationResult, safeAtob(), verifyHumanFace()

### Community 89 - "Json Backgroundcolor Image"
Cohesion: 0.29
Nodes (7): backgroundColor, image, splash, backgroundColor, dark, image, resizeMode

### Community 90 - "Useformdraft Hooks Test"
Cohesion: 0.38
Nodes (5): AutosaveBadgeProps, AutosaveStatus, DraftOptions, isMeaningfulDraft(), useFormDraft()

### Community 91 - "Analytics Service Services"
Cohesion: 0.29
Nodes (6): ActivityEvent, fetchRoutePopularity(), fetchUserActivityTimeline(), fetchUserStats(), RoutePopularity, UserStats

### Community 92 - "Json Cfbundledisplayname Cfbundlename"
Cohesion: 0.33
Nodes (6): CFBundleDisplayName, CFBundleName, NSCameraUsageDescription, NSLocationWhenInUseUsageDescription, NSPhotoLibraryUsageDescription, infoPlist

### Community 93 - "Retry Queryclient Query"
Cohesion: 0.73
Nodes (3): queryClient, retryDelay(), shouldRetry()

### Community 94 - "Package Json Exclude"
Cohesion: 0.33
Nodes (6): exclude, reactNativeDirectoryCheck, expo, autolinking, doctor, listUnknownPackages

### Community 95 - "React Native Razorpay"
Cohesion: 0.33
Nodes (4): RazorpayCheckout, RazorpayOptions, RazorpaySuccess, react-native-razorpay

### Community 96 - "Json Web Bundler"
Cohesion: 0.40
Nodes (5): web, bundler, favicon, name, output

### Community 97 - "Tripcard Components Feature"
Cohesion: 0.50
Nodes (4): formatTripRating(), getTripAccessibilityLabel(), getVehicleMeta(), VEHICLE_CONFIG

### Community 98 - "Timing Constants Animation"
Cohesion: 0.40
Nodes (4): ANIMATION_DURATIONS, AUTH_TIMEOUTS, DELAYS, POLLING_INTERVALS

### Community 99 - "Metro Expo Package"
Cohesion: 0.40
Nodes (4): config, { getDefaultConfig }, expo@~53.0.27, expo

### Community 100 - "Json Projectid Extra"
Cohesion: 0.50
Nodes (4): projectId, extra, eas, router

### Community 101 - "Json Updates Checkautomatically"
Cohesion: 0.50
Nodes (4): updates, checkAutomatically, fallbackToCacheTimeout, url

### Community 102 - "Test Sandbox Assets"
Cohesion: 0.83
Nodes (3): run(), testAuth(), testEndpoints()

## Knowledge Gaps
- **14 isolated node(s):** `UNKNOWN`, `NETWORK_OFFLINE`, `NETWORK_TIMEOUT`, `AUTH_EXPIRED`, `AUTH_INVALID` (+9 more)
  These have ≤1 connection - possible missing edges. (Counts symbols only; 740 node(s) total have ≤1 connection when file, concept and rationale nodes are included.)
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `react` connect `Components Feature Deliverymap` to `Components Feature Microinteractions`, `Components Feature Styles`, `Package Json React`, `Components Feature Service`, `Components Feature Lottieviewwrapper`, `Service Services Parcels`, `Components Feature Styles`, `Support Services Service`, `Notifications Service Services`, `Conversations Queries Features`, `Images Queries Parcel`, `Components Expressionstarrating Feature`, `Tabs Components Profile`, `Services Service Payments`, `Legal Styles Policy`, `Requests Activity Features`, `Rewards Services Service`, `Components Feature Trip`, `Service Services Secure`, `Contexts Layout Notificationcontext`, `Components Feature Livemarketplaceheader`, `Components Feature Sevendayschedulepicker`, `Profile Kyc Services`, `Search Components Feature`, `Components Trusttierbadge Card`, `Components Trip Feature`, `Messages Tabs Dateformat`, `Template Context Constants`, `Cities Indian Constants`, `Hooks Route Intelligence`, `Illustrations Components Categoryillustrations`, `Payment Apperrorboundary Components`, `Promotionalbannercarousel Components Feature`, `Components Feature Matchinghelpers`, `Components Feature Requestcard`, `Useanimations Hooks Usebreathing`, `Rate Limiter Useratelimiter`, `Error Handler Useretryableaction`, `Safetyonboarding Components Feature`, `Parcel Components Feature`, `Notifications Usenotifications Services`, `Price Estimator Services`, `Onboarding Productillustration Components`, `Tabs Layout Useresponsive`, `Subscriptions Service Services`, `Components Feature Stepindicator`, `Usenetworkstatus Hooks React`, `Updates Service Services`, `Package Json Usesavedroutes`, `Useroutemap Hooks Indiancity`, `Animatedicon Components Test`, `Useformdraft Hooks Test`?**
  _High betweenness centrality (0.105) - this node is a cross-community bridge._
- **What connects `UNKNOWN`, `NETWORK_OFFLINE`, `NETWORK_TIMEOUT` to the rest of the system?**
  _14 weakly-connected nodes found - possible missing edges._
- **Should `Email Services Templates` be split into smaller, more focused modules?**
  _Cohesion score 0.058151609553478714 - nodes in this community are weakly interconnected._
- **Why does `react-native` connect `Components Feature Styles` to `Components Feature Microinteractions`, `Components Feature Styles`, `Package Json React`, `Components Feature Service`, `Components Feature Lottieviewwrapper`, `Support Services Service`, `Notifications Service Services`, `Conversations Queries Features`, `Images Queries Parcel`, `Components Expressionstarrating Feature`, `Tabs Components Profile`, `Services Service Payments`, `Legal Styles Policy`, `Requests Activity Features`, `Rewards Services Service`, `Components Feature Deliverymap`, `Components Feature Trip`, `Contexts Layout Notificationcontext`, `Components Feature Livemarketplaceheader`, `Components Feature Sevendayschedulepicker`, `Profile Kyc Services`, `Search Components Feature`, `Components Trusttierbadge Card`, `Components Trip Feature`, `Messages Tabs Dateformat`, `Template Context Constants`, `Cities Indian Constants`, `Payment Apperrorboundary Components`, `Promotionalbannercarousel Components Feature`, `Components Feature Matchinghelpers`, `Components Feature Requestcard`, `Monitoring Test Capturemessage`, `Useanimations Hooks Usebreathing`, `Safetyonboarding Components Feature`, `Parcel Components Feature`, `Notifications Usenotifications Services`, `Onboarding Productillustration Components`, `Tabs Layout Useresponsive`, `Subscriptions Service Services`, `Components Feature Stepindicator`, `Updates Service Services`, `Package Json Usesavedroutes`, `Animatedicon Components Test`?**
  _High betweenness centrality (0.098) - this node is a cross-community bridge._
- **Should `Components Feature Microinteractions` be split into smaller, more focused modules?**
  _Cohesion score 0.04432284541723666 - nodes in this community are weakly interconnected._
- **Why does `getSharedSupabaseClient()` connect `Services Service Payments` to `Email Services Templates`, `Components Feature Service`, `Service Services Parcels`, `Support Services Service`, `Notifications Service Services`, `Conversations Queries Features`, `Service Services Storage`, `Service Services Requests`, `Requests Activity Features`, `Rewards Services Service`, `Components Feature Trip`, `Service Services Secure`, `Profile Kyc Services`, `Service Services Conversations`, `Kyc Service Services`, `Core Template Configmanager`, `Cities Indian Constants`, `Hooks Route Intelligence`, `Payment Apperrorboundary Components`, `Notifications Usenotifications Services`, `Price Estimator Services`, `Subscriptions Service Services`, `Corridors Service Services`, `Database Template Core`, `Package Json Usesavedroutes`, `Avatar Enrichment Services`, `Analytics Service Services`?**
  _High betweenness centrality (0.071) - this node is a cross-community bridge._
- **Should `Components Feature Styles` be split into smaller, more focused modules?**
  _Cohesion score 0.06526806526806526 - nodes in this community are weakly interconnected._