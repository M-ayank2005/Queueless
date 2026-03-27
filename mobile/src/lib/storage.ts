import AsyncStorage from "@react-native-async-storage/async-storage";
import { User } from "../types";

const TOKEN_KEY = "ql_token";
const USER_KEY = "ql_user";

export async function saveAuthSession(token: string, user: User): Promise<void> {
  await AsyncStorage.multiSet([
    [TOKEN_KEY, token],
    [USER_KEY, JSON.stringify(user)],
  ]);
}

export async function readAuthSession(): Promise<{ token: string | null; user: User | null }> {
  const [token, userRaw] = await AsyncStorage.multiGet([TOKEN_KEY, USER_KEY]);
  const user = userRaw[1] ? (JSON.parse(userRaw[1]) as User) : null;
  return { token: token[1], user };
}

export async function clearAuthSession(): Promise<void> {
  await AsyncStorage.multiRemove([TOKEN_KEY, USER_KEY]);
}
