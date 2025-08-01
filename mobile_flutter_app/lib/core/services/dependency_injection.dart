import 'package:get_it/get_it.dart';
import 'package:dio/dio.dart';
import 'package:shared_preferences/shared_preferences.dart';
import 'package:logger/logger.dart';

// Data sources
import '../../features/auth/data/datasources/auth_remote_datasource.dart';
import '../../features/groups/data/datasources/groups_remote_datasource.dart';
import '../../features/chat/data/datasources/chat_remote_datasource.dart';
import '../../features/websocket/data/datasources/websocket_datasource.dart';

// Repositories
import '../../features/auth/data/repositories/auth_repository_impl.dart';
import '../../features/groups/data/repositories/groups_repository_impl.dart';
import '../../features/chat/data/repositories/chat_repository_impl.dart';
import '../../features/websocket/data/repositories/websocket_repository_impl.dart';

// Domain repositories
import '../../features/auth/domain/repositories/auth_repository.dart';
import '../../features/groups/domain/repositories/groups_repository.dart';
import '../../features/chat/domain/repositories/chat_repository.dart';
import '../../features/websocket/domain/repositories/websocket_repository.dart';

// Use cases
import '../../features/auth/domain/usecases/login_usecase.dart';
import '../../features/auth/domain/usecases/logout_usecase.dart';
import '../../features/auth/domain/usecases/get_user_usecase.dart';
import '../../features/groups/domain/usecases/get_groups_usecase.dart';
import '../../features/groups/domain/usecases/create_group_usecase.dart';
import '../../features/groups/domain/usecases/get_group_members_usecase.dart';
import '../../features/chat/domain/usecases/get_message_history_usecase.dart';
import '../../features/chat/domain/usecases/send_message_usecase.dart';
import '../../features/chat/domain/usecases/delete_message_usecase.dart';
import '../../features/chat/domain/usecases/edit_message_usecase.dart';
import '../../features/websocket/domain/usecases/connect_websocket_usecase.dart';
import '../../features/websocket/domain/usecases/join_group_usecase.dart';
import '../../features/websocket/domain/usecases/send_websocket_message_usecase.dart';

// Blocs
import '../../features/auth/presentation/bloc/auth_bloc.dart';
import '../../features/groups/presentation/bloc/groups_bloc.dart';
import '../../features/chat/presentation/bloc/chat_bloc.dart';
import '../../features/websocket/presentation/bloc/websocket_bloc.dart';

// Services
import '../services/api_service.dart';
import '../services/local_storage_service.dart';
import '../services/notification_service.dart';
import '../config/app_config.dart';

final getIt = GetIt.instance;

class DependencyInjection {
  static Future<void> init() async {
    // External dependencies
    final sharedPreferences = await SharedPreferences.getInstance();
    getIt.registerLazySingleton(() => sharedPreferences);

    final logger = Logger();
    getIt.registerLazySingleton(() => logger);

    // Dio instance
    final dio = Dio(BaseOptions(
      baseUrl: AppConfig.apiBaseUrl,
      connectTimeout: AppConfig.connectionTimeout,
      receiveTimeout: AppConfig.receiveTimeout,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    ));

    // Add interceptors
    dio.interceptors.add(LogInterceptor(
      requestBody: true,
      responseBody: true,
      logPrint: (object) => logger.d(object),
    ));

    getIt.registerLazySingleton(() => dio);

    // Services
    getIt.registerLazySingleton<ApiService>(() => ApiService(getIt()));
    getIt.registerLazySingleton<LocalStorageService>(() => LocalStorageService(getIt()));
    getIt.registerLazySingleton<NotificationService>(() => NotificationService());

    // Data sources
    getIt.registerLazySingleton<AuthRemoteDataSource>(
      () => AuthRemoteDataSourceImpl(getIt()),
    );
    getIt.registerLazySingleton<GroupsRemoteDataSource>(
      () => GroupsRemoteDataSourceImpl(getIt()),
    );
    getIt.registerLazySingleton<ChatRemoteDataSource>(
      () => ChatRemoteDataSourceImpl(getIt()),
    );
    getIt.registerLazySingleton<WebSocketDataSource>(
      () => WebSocketDataSourceImpl(),
    );

    // Repositories
    getIt.registerLazySingleton<AuthRepository>(
      () => AuthRepositoryImpl(
        remoteDataSource: getIt(),
        localStorageService: getIt(),
      ),
    );
    getIt.registerLazySingleton<GroupsRepository>(
      () => GroupsRepositoryImpl(
        remoteDataSource: getIt(),
        localStorageService: getIt(),
      ),
    );
    getIt.registerLazySingleton<ChatRepository>(
      () => ChatRepositoryImpl(
        remoteDataSource: getIt(),
        localStorageService: getIt(),
      ),
    );
    getIt.registerLazySingleton<WebSocketRepository>(
      () => WebSocketRepositoryImpl(
        dataSource: getIt(),
        localStorageService: getIt(),
      ),
    );

    // Use cases
    getIt.registerLazySingleton(() => LoginUseCase(getIt()));
    getIt.registerLazySingleton(() => LogoutUseCase(getIt()));
    getIt.registerLazySingleton(() => GetUserUseCase(getIt()));
    getIt.registerLazySingleton(() => GetGroupsUseCase(getIt()));
    getIt.registerLazySingleton(() => CreateGroupUseCase(getIt()));
    getIt.registerLazySingleton(() => GetGroupMembersUseCase(getIt()));
    getIt.registerLazySingleton(() => GetMessageHistoryUseCase(getIt()));
    getIt.registerLazySingleton(() => SendMessageUseCase(getIt()));
    getIt.registerLazySingleton(() => DeleteMessageUseCase(getIt()));
    getIt.registerLazySingleton(() => EditMessageUseCase(getIt()));
    getIt.registerLazySingleton(() => ConnectWebSocketUseCase(getIt()));
    getIt.registerLazySingleton(() => JoinGroupUseCase(getIt()));
    getIt.registerLazySingleton(() => SendWebSocketMessageUseCase(getIt()));

    // Blocs
    getIt.registerFactory(() => AuthBloc(
      loginUseCase: getIt(),
      logoutUseCase: getIt(),
      getUserUseCase: getIt(),
    ));
    getIt.registerFactory(() => GroupsBloc(
      getGroupsUseCase: getIt(),
      createGroupUseCase: getIt(),
      getGroupMembersUseCase: getIt(),
    ));
    getIt.registerFactory(() => ChatBloc(
      getMessageHistoryUseCase: getIt(),
      sendMessageUseCase: getIt(),
      deleteMessageUseCase: getIt(),
      editMessageUseCase: getIt(),
    ));
    getIt.registerFactory(() => WebSocketBloc(
      connectWebSocketUseCase: getIt(),
      joinGroupUseCase: getIt(),
      sendWebSocketMessageUseCase: getIt(),
    ));
  }
}
