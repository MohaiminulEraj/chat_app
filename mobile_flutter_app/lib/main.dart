import 'package:flutter/material.dart';
import 'package:flutter_bloc/flutter_bloc.dart';
import 'package:hive_flutter/hive_flutter.dart';
import 'package:go_router/go_router.dart';

import 'core/config/app_config.dart';
import 'core/services/dependency_injection.dart';
import 'core/themes/app_theme.dart';
import 'core/routing/app_router.dart';
import 'features/auth/presentation/bloc/auth_bloc.dart';
import 'features/groups/presentation/bloc/groups_bloc.dart';
import 'features/chat/presentation/bloc/chat_bloc.dart';
import 'features/websocket/presentation/bloc/websocket_bloc.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();

  // Initialize Hive for local storage
  await Hive.initFlutter();

  // Initialize dependency injection
  await DependencyInjection.init();

  runApp(const KittyGroupChatApp());
}

class KittyGroupChatApp extends StatelessWidget {
  const KittyGroupChatApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiBlocProvider(
      providers: [
        BlocProvider<AuthBloc>(
          create: (context) => getIt<AuthBloc>()..add(AuthCheckStatusEvent()),
        ),
        BlocProvider<WebSocketBloc>(
          create: (context) => getIt<WebSocketBloc>(),
        ),
        BlocProvider<GroupsBloc>(
          create: (context) => getIt<GroupsBloc>(),
        ),
        BlocProvider<ChatBloc>(
          create: (context) => getIt<ChatBloc>(),
        ),
      ],
      child: MaterialApp.router(
        title: 'Kitty Group Chat',
        debugShowCheckedModeBanner: false,
        theme: AppTheme.lightTheme,
        darkTheme: AppTheme.darkTheme,
        themeMode: ThemeMode.system,
        routerConfig: AppRouter.router,
      ),
    );
  }
}
