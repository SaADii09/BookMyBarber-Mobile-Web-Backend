import React, { useCallback, useEffect, useState, type ReactNode } from "react";
import {
    View,
    ScrollView,
    TextInput,
    ActivityIndicator,
    RefreshControl,
    Image,
    Modal,
    TouchableOpacity,
} from "react-native";
import CropPicker from "react-native-image-crop-picker";
import { SymbolView } from "expo-symbols";
import { SafeAreaView } from "react-native-safe-area-context";
import { router, useIsFocused } from "expo-router";

import { ThemedText } from "@/components/themed-text";
import { HapticPressable, PrimaryButton } from "@/components/ui";
import { COLORS, PLACEHOLDER_COLOR } from "@/constants/design-tokens";
import { btn, card, chip, input, screen } from "@/constants/ui-classes";
import { useAuthSession } from "@/contexts/auth-session";
import { appAlert } from "@/lib/app-alert";
import { formatApiError } from "@/lib/network-error";
import {
    fetchProfile,
    updateProfile,
    uploadAvatar,
    PROFILE_CITIES,
    type AppProfile,
    type ProfileCity,
} from "@/lib/profile";
import {
    formatPakistanPhoneDisplay,
    sanitizePakistanPhoneInput,
    toPakistanE164,
} from "@/lib/pakistan-phone";
import { Animated, Easing } from "react-native";

function CollapsibleSection({
    title,
    expanded,
    onToggle,
    children,
}: {
    title: string;
    expanded: boolean;
    onToggle: () => void;
    children: ReactNode;
}) {
    return (
        <View className={card.base}>
            <HapticPressable
                className="flex-row items-center justify-between"
                onPress={onToggle}
            >
                <ThemedText type="smallBold">{title}</ThemedText>
                <SymbolView
                    name={{ ios: expanded ? "chevron.down" : "chevron.right", android: expanded ? "expand_less" : "chevron_right", web: expanded ? "expand_less" : "chevron_right" }}
                    size={14}
                    tintColor={COLORS.mutedForeground}
                />
            </HapticPressable>
            {expanded && <View className="mt-4 gap-4">{children}</View>}
        </View>
    );
}

export default function ProfileScreen() {
    const { user, signOut, signingOut } = useAuthSession();
    const [profile, setProfile] = useState<AppProfile | null>(null);
    const [loading, setLoading] = useState(true);
    const [refreshing, setRefreshing] = useState(false);
    const [saving, setSaving] = useState(false);
    const [name, setName] = useState("");
    const [phoneNational, setPhoneNational] = useState("");
    const [city, setCity] = useState<ProfileCity>("Lahore");
    const [avatarUrl, setAvatarUrl] = useState("");
    const [profileOpen, setProfileOpen] = useState(true);

    const [avatarModalVisible, setAvatarModalVisible] = useState(false);
    const [avatarUploading, setAvatarUploading] = useState(false);

    // Style Guide button animation
    const [styleGuideAnim] = useState(() => new Animated.Value(0));
    const [isNavigating, setIsNavigating] = useState(false);

    const isFocused = useIsFocused();

    useEffect(() => {
        if (isFocused) {
            setIsNavigating(false);
        }
    }, [isFocused]);

    const handleStyleGuidePress = () => {
        console.log('[Profile] Style Guide button pressed - click detected');
        Animated.timing(styleGuideAnim, {
            toValue: 1,
            duration: 100,
            easing: Easing.out(Easing.ease),
            useNativeDriver: false,
        }).start(() => {
            Animated.timing(styleGuideAnim, {
                toValue: 0,
                duration: 100,
                easing: Easing.out(Easing.ease),
                useNativeDriver: false,
            }).start();
        });
        console.log('[Profile] Navigating to /style-guide...');
        setIsNavigating(true);
        router.push("/style-guide" as any);
    };

    const applyProfile = (p: AppProfile) => {
        setProfile(p);
        setName(p.name ?? "");
        const raw = p.phone ?? "";
        setPhoneNational(
            raw.startsWith("+92")
                ? sanitizePakistanPhoneInput(raw.slice(3))
                : sanitizePakistanPhoneInput(raw),
        );
        setCity(p.city);
        setAvatarUrl(p.avatar_url ?? "");
    };

    const load = useCallback(
        async (opts?: { silent?: boolean }) => {
            if (user?.role === "admin") {
                setProfile(null);
                setLoading(false);
                return;
            }
            if (!opts?.silent) setLoading(true);
            try {
                applyProfile(await fetchProfile());
            } catch (err: unknown) {
                appAlert(
                    "Error",
                    formatApiError(err, "Could not load profile"),
                );
            } finally {
                setLoading(false);
                setRefreshing(false);
            }
        },
        [user?.role],
    );

    useEffect(() => {
        void load();
    }, [load]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        void load({ silent: true });
    }, [load]);

    const handleSave = async () => {
        const trimmedName = name.trim();
        if (!trimmedName) {
            appAlert("Name required", "Enter your display name.");
            return;
        }
        const phoneE164 = phoneNational.trim()
            ? toPakistanE164(phoneNational)
            : null;
        if (phoneNational.trim() && !phoneE164) {
            appAlert(
                "Invalid phone",
                "Enter a valid Pakistan mobile number (3XX…).",
            );
            return;
        }
        setSaving(true);
        try {
            const updated = await updateProfile({
                name: trimmedName,
                phone: phoneE164 ?? undefined,
                city,
            });
            applyProfile(updated);
            appAlert("Saved", "Your profile has been updated.");
        } catch (err: unknown) {
            appAlert("Error", formatApiError(err, "Could not save profile"));
        } finally {
            setSaving(false);
        }
    };

    const handlePickFromGallery = async () => {
        try {
            const image = await CropPicker.openPicker({
                width: 512,
                height: 512,
                cropping: true,
                cropperCircleOverlay: true,
                cropperRotateEnabled: true,
                mediaType: "photo",
            });
            await handleUploadAvatar(image.path);
        } catch (err: any) {
            if (err?.code !== "E_PICKER_CANCELLED") {
                appAlert("Error", "Could not select image");
            }
        }
    };

    const handleTakePhoto = async () => {
        try {
            const image = await CropPicker.openCamera({
                width: 512,
                height: 512,
                cropping: true,
                cropperCircleOverlay: true,
                cropperRotateEnabled: true,
                mediaType: "photo",
            });
            await handleUploadAvatar(image.path);
        } catch (err: any) {
            if (err?.code !== "E_PICKER_CANCELLED") {
                appAlert("Error", "Could not take photo");
            }
        }
    };

    const handleUploadAvatar = async (uri: string) => {
        setAvatarUploading(true);
        try {
            const newUrl = await uploadAvatar(uri);
            setAvatarUrl(newUrl);
            setAvatarModalVisible(false);
        } catch (err: unknown) {
            appAlert(
                "Upload failed",
                formatApiError(err, "Could not upload avatar"),
            );
        } finally {
            setAvatarUploading(false);
        }
    };

    if (loading && !profile) {
        return (
            <SafeAreaView className={screen.center}>
                <ActivityIndicator size="large" color={COLORS.primary} />
            </SafeAreaView>
        );
    }

    if (user?.role === "admin") {
        return (
            <SafeAreaView className={screen.padded}>
                <ThemedText type="subtitle">Admin account</ThemedText>
                <ThemedText themeColor="textSecondary" className="mt-3">
                    Use the BookMyBarber web dashboard for admin tasks.
                </ThemedText>
                <HapticPressable
                    className={`${btn.secondary} mt-6`}
                    onPress={() => signOut()}
                    disabled={signingOut}
                >
                    {signingOut ? (
                        <ActivityIndicator size="small" color={COLORS.primary} />
                    ) : (
                        <ThemedText className={btn.secondaryText}>
                            Sign out
                        </ThemedText>
                    )}
                </HapticPressable>
            </SafeAreaView>
        );
    }

    return (
        <SafeAreaView className={screen.root}>
            <ScrollView
                contentInsetAdjustmentBehavior="automatic"
                contentContainerClassName={screen.scrollContent}
                refreshControl={
                    <RefreshControl
                        refreshing={refreshing}
                        onRefresh={onRefresh}
                    />
                }
            >
                {/* ─── Header row ─── */}
                <View className="flex-row items-center gap-2">
                    <ThemedText type="subtitle">
                        My Profile & Settings
                    </ThemedText>
                </View>
                <ThemedText themeColor="textSecondary">
                    Manage your account details. Email cannot be changed here.
                </ThemedText>

                {/* ─── Avatar + Style Guide split card ─── */}
                <View className={`${card.base} flex-row items-stretch`}>
{/* Avatar side */}
                    <View className="flex-1 items-center justify-center py-2">
                        <TouchableOpacity
                            onPress={() => setAvatarModalVisible(true)}
                            className="items-center gap-2"
                        >
                            <ThemedText className="font-body text-xs text-muted-foreground mb-1">
                                Profile Picture
                            </ThemedText>
                            <Image
                                source={{
                                    uri:
                                        avatarUrl ||
                                        "https://i.pravatar.cc/200?u=default",
                                }}
                                className="h-20 w-20 rounded-full bg-muted"
                                resizeMode="cover"
                            />
                            <ThemedText className="font-body text-xs font-semibold text-primary">
                                Change
                            </ThemedText>
                        </TouchableOpacity>
                    </View>

                    {/* Vertical divider */}
                    <View className="w-px bg-border mx-3" />

                    {/* Style Guide side */}
                    <View className="flex-1 relative">
                        <Animated.View
                            style={{
                                flex: 1,
                                transform: [{ scale: styleGuideAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 0.95] }) }],
                            }}>
                            <HapticPressable
                                haptic="medium"
                                className="flex-1 items-center justify-center py-4 gap-2 rounded-xl bg-primary/10 border-2 border-primary/30 active:bg-primary/20"
                                onPress={handleStyleGuidePress}
                                disabled={isNavigating}
                                style={isNavigating ? { opacity: 0.7 } : {}}
                            >
                                <Animated.View
                                    style={{
                                        transform: [{ scale: styleGuideAnim.interpolate({ inputRange: [0, 1], outputRange: [1, 1.1] }) }],
                                    }}>
                                    <SymbolView
                                        name={{ ios: 'paintpalette.fill', android: 'palette', web: 'palette' }}
                                        fallback={<ThemedText className="text-primary text-2xl">🎨</ThemedText>}
                                        size={32}
                                        tintColor={COLORS.primary}
                                    />
                                </Animated.View>
                                <ThemedText
                                    type="smallBold"
                                    className="text-primary text-center"
                                >
                                    AI Style Guide
                                </ThemedText>
                                <ThemedText
                                    type="small"
                                    themeColor="textSecondary"
                                    className="text-center"
                                >
                                    {isNavigating ? "Loading..." : "Get AI haircut suggestions"}
                                </ThemedText>
                            </HapticPressable>
                        </Animated.View>
                        <View className="absolute bottom-2 right-2">
                            <SymbolView
                                name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
                                size={12}
                                tintColor={COLORS.primary}
                            />
                        </View>
                    </View>
                </View>

                {/* ─── Support ─── */}
                <HapticPressable
                    className={`${btn.secondary} w-full mt-4 flex-row items-center justify-between`}
                    onPress={() => router.push("/support" as any)}
                >
                    <ThemedText className={btn.secondaryText}>
                        Feedback & Support
                    </ThemedText>
                    <SymbolView
                        name={{ ios: 'chevron.right', android: 'chevron_right', web: 'chevron_right' }}
                        size={14}
                        tintColor={COLORS.primary}
                    />
                </HapticPressable>

                {/* ─── Account Details ─── */}
                <CollapsibleSection
                    title="Account Details"
                    expanded={profileOpen}
                    onToggle={() => setProfileOpen((p) => !p)}
                >
                    <View className={chip.base}>
                        <ThemedText className="font-body text-xs text-muted-foreground">
                            Email
                        </ThemedText>
                        <ThemedText
                            selectable
                            className="mt-1 font-body font-semibold text-foreground"
                        >
                            {profile?.email ?? user?.email ?? "—"}
                        </ThemedText>
                    </View>

                    <View className={chip.base}>
                        <ThemedText className="font-body text-xs text-muted-foreground">
                            Role
                        </ThemedText>
                        <ThemedText
                            selectable
                            className="mt-1 font-body font-semibold capitalize text-primary"
                        >
                            {profile?.role ?? user?.role ?? "—"}
                        </ThemedText>
                    </View>

                    <ThemedText className="font-body text-sm font-semibold text-foreground">
                        Display name
                    </ThemedText>
                    <TextInput
                        className={input.base}
                        placeholder="Your name"
                        placeholderTextColor={PLACEHOLDER_COLOR}
                        value={name}
                        onChangeText={setName}
                    />

                    <ThemedText className="font-body text-sm font-semibold text-foreground">
                        Phone (PK)
                    </ThemedText>
                    <TextInput
                        className={input.base}
                        placeholder="300 1234567"
                        placeholderTextColor={PLACEHOLDER_COLOR}
                        value={formatPakistanPhoneDisplay(phoneNational)}
                        onChangeText={(t) =>
                            setPhoneNational(sanitizePakistanPhoneInput(t))
                        }
                        keyboardType="phone-pad"
                    />

                    <ThemedText className="font-body text-sm font-semibold text-foreground">
                        City
                    </ThemedText>
                    <View className="flex-row gap-2">
                        {PROFILE_CITIES.map((c) => (
                            <HapticPressable
                                key={c}
                                className={`${chip.base} flex-1 ${city === c ? chip.active : ""}`}
                                onPress={() => setCity(c)}
                            >
                                <ThemedText
                                    className={`${chip.text} text-center text-xs`}
                                >
                                    {c}
                                </ThemedText>
                            </HapticPressable>
                        ))}
                    </View>

                    <PrimaryButton loading={saving} onPress={handleSave}>
                        <ThemedText className="font-body font-semibold text-primary-foreground">
                            Save changes
                        </ThemedText>
                    </PrimaryButton>
                </CollapsibleSection>

                {/* ─── Sign out ─── */}
                <HapticPressable
                    className="rounded-xl border border-destructive/40 px-4 py-3 items-center"
                    onPress={() => signOut()}
                    disabled={signingOut}
                >
                    {signingOut ? (
                        <ActivityIndicator size="small" color={COLORS.destructive} />
                    ) : (
                        <ThemedText className="font-body font-semibold text-destructive">
                            Sign out
                        </ThemedText>
                    )}
                </HapticPressable>
            </ScrollView>

            {/* ─── Avatar picker modal ─── */}
            <Modal
                visible={avatarModalVisible}
                transparent
                animationType="slide"
                onRequestClose={() => setAvatarModalVisible(false)}
            >
                <TouchableOpacity
                    className="flex-1 justify-end bg-black/60"
                    activeOpacity={1}
                    onPress={() => setAvatarModalVisible(false)}
                >
                    <View
                        className="rounded-t-2xl bg-background p-6 gap-4"
                        style={{ paddingBottom: 100 }}
                        onStartShouldSetResponder={() => true}
                    >
                        {avatarUploading ? (
                            <View className="items-center py-6">
                                <ActivityIndicator
                                    size="large"
                                    color={COLORS.primary}
                                />
                                <ThemedText className="mt-3 font-body text-muted-foreground">
                                    Uploading avatar...
                                </ThemedText>
                            </View>
                        ) : (
                            <>
                                <ThemedText
                                    type="subtitle"
                                    className="text-center"
                                >
                                    Profile Picture
                                </ThemedText>

                                <HapticPressable
                                    haptic="medium"
                                    className={btn.primary}
                                    onPress={handlePickFromGallery}
                                >
                                    <ThemedText className={btn.primaryText}>
                                        Choose from Gallery
                                    </ThemedText>
                                </HapticPressable>

                                <HapticPressable
                                    haptic="medium"
                                    className={btn.primary}
                                    onPress={handleTakePhoto}
                                >
                                    <ThemedText className={btn.primaryText}>
                                        Take Photo
                                    </ThemedText>
                                </HapticPressable>

                                <HapticPressable
                                    className={`${btn.secondary} mt-2`}
                                    onPress={() => setAvatarModalVisible(false)}
                                >
                                    <ThemedText className={btn.secondaryText}>
                                        Cancel
                                    </ThemedText>
                                </HapticPressable>
                            </>
                        )}
                    </View>
                </TouchableOpacity>
            </Modal>
        </SafeAreaView>
    );
}
