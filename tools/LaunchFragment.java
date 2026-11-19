// Abre a página de debug escondida do Mi Fitness (ThirdAppDebugFragment), que instala Quick Apps na pulseira.
// Roda no celular via app_process como usuário shell. Adaptado de github.com/mhdbaselar/xiaomi-band-development (MIT).
import android.content.Intent;
import android.os.Bundle;
import android.os.Looper;
import android.os.Parcelable;

public class LaunchFragment {
    public static void main(String[] args) {
        try {
            Looper.prepareMainLooper();
            String apkPath = args[0];
            String packageName = args.length > 1 ? args[1] : "";
            int versionCode = args.length > 2 ? Integer.parseInt(args[2]) : 1;
            dalvik.system.PathClassLoader cl = new dalvik.system.PathClassLoader(apkPath, ClassLoader.getSystemClassLoader());
            Class<?> builderClass = cl.loadClass("com.xiaomi.fitness.baseui.common.FragmentParams$b");
            Object builder = builderClass.newInstance();
            Class<?> fragmentClass;
            String mode;
            try {
                fragmentClass = cl.loadClass("com.xiaomi.xms.wearable.ui.debug.ThirdAppDebugFragment");
                mode = "DEBUG";
            } catch (ClassNotFoundException removedDebugPage) {
                fragmentClass = cl.loadClass("com.xiaomi.xms.wearable.ui.appshop.detail.ThirdAppDetailFragment");
                Bundle bundle = new Bundle();
                String json = "{\"bean\":{" +
                    "\"app_name\":\"Placar Tenis\"," +
                    "\"app_version_code\":" + versionCode + "," +
                    "\"change_log\":\"Atualizacao local\"," +
                    "\"description\":\"Placar para pulseira\"," +
                    "\"developer_name\":\"REA\"," +
                    "\"download_url\":\"\"," +
                    "\"icon\":\"\"," +
                    "\"introduction\":\"Atualizacao do Placar Tenis\"," +
                    "\"package_name\":\"" + packageName + "\"," +
                    "\"record_number\":\"\"," +
                    "\"size\":1," +
                    "\"support_client_v\":\"\"," +
                    "\"support_firmware_v\":\"\"," +
                    "\"type_name\":\"local\"," +
                    "\"updateTime\":\"1\"}," +
                    "\"localBean\":null," +
                    "\"beanStatus\":{\"packageName\":\"" + packageName + "\",\"status\":0,\"statusValue\":0}}";
                bundle.putString("extra_app_info", json);
                builderClass.getMethod("c", Bundle.class).invoke(builder, bundle);
                mode = "DETAIL";
            }
            builderClass.getMethod("e", Class.class).invoke(builder, fragmentClass);
            Object fp = builderClass.getMethod("b").invoke(builder);
            Intent intent = new Intent();
            intent.setClassName("com.xiaomi.wearable", "com.xiaomi.fitness.baseui.common.CommonBaseActivity");
            intent.addFlags(Intent.FLAG_ACTIVITY_NEW_TASK);
            intent.putExtra("fragment_param", (Parcelable) fp);
            Class<?> amClass = Class.forName("android.app.ActivityManager");
            java.lang.reflect.Method getService = amClass.getDeclaredMethod("getService");
            getService.setAccessible(true);
            Object am = getService.invoke(null);
            // A assinatura de startActivity muda entre versoes do Android (10 ou 11 parametros,
            // com callingFeatureId a mais). Preenche o primeiro String com o pacote chamador,
            // em vez de confiar num indice fixo, senao o sistema recebe null e nega a permissao.
            for (java.lang.reflect.Method m : am.getClass().getMethods()) {
                Class<?>[] params = m.getParameterTypes();
                if (!m.getName().equals("startActivity") || params.length < 10 || params.length > 11) continue;
                Object[] callArgs = new Object[params.length];
                boolean pacoteDefinido = false;
                for (int i = 0; i < params.length; i++) {
                    if (params[i] == int.class) callArgs[i] = 0;
                    else if (params[i] == Intent.class) callArgs[i] = intent;
                    else if (params[i] == String.class && !pacoteDefinido) {
                        callArgs[i] = "com.android.shell";
                        pacoteDefinido = true;
                    } else callArgs[i] = null;
                }
                m.invoke(am, callArgs);
                System.out.println("SUCCESS MODE:" + mode + " PARAMS:" + params.length);
                return;
            }
            System.out.println("FAILED: no matching startActivity method");
        } catch (Throwable e) {
            System.err.println("ERROR: " + e);
            e.printStackTrace();
        }
    }
}
