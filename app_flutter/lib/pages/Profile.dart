import 'package:app_flutter/pages/home.dart';
import 'package:app_flutter/pages/login.dart';

import 'package:flutter/material.dart';
import '../../services/user_service.dart';
import 'package:shared_preferences/shared_preferences.dart';

class Profile extends StatefulWidget {
  const Profile({Key? key}) : super(key: key);

  @override
  _ProfileState createState() => _ProfileState();
}

class _ProfileState extends State<Profile> {
  final UserService _userService = UserService();
  late Future<Map<String, dynamic>> _userData;
  bool isLoggedIn = true;
  @override
  void initState() {
    super.initState();
    _userData = _userService.getCurrentUser();
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(
        title: const Text('Thông tin cá nhân'),
      ),
      body: FutureBuilder<Map<String, dynamic>>(
        future: _userData,
        builder: (context, snapshot) {
          if (snapshot.connectionState == ConnectionState.waiting) {
            return const Center(child: CircularProgressIndicator());
          } else if (snapshot.hasError) {
            return Center(child: Text('Lỗi: ${snapshot.error}'));
          } else if (snapshot.hasData && snapshot.data != null) {
            final String username = snapshot.data?['name'] ?? 'Người dùng';
            final String memberId = snapshot.data?['memberId'] ?? 'N/A';
            final int balance = snapshot.data?['balance'] ?? 0;

            return SingleChildScrollView(
              child: Padding(
                padding: const EdgeInsets.all(16.0),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    _buildProfileHeader(username, memberId, balance),
                    const SizedBox(height: 16),
                    _buildActionButtons(context),
                    const SizedBox(height: 16),
                    _buildSignOutButton(context), // Nút đăng xuất
                  ],
                ),
              ),
            );
          } else {
            return const Center(
                child: Text(
                    'Không tìm thấy thông tin người dùng')); // Xử lý khi không có dữ liệu
          }
        },
      ),
    );
  }

  // Hiển thị phần thông tin tài khoản và số dư
  Widget _buildProfileHeader(String username, String memberId, int balance) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '$username!',
          style: const TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
        ),
        const SizedBox(height: 8),
        Row(
          mainAxisAlignment: MainAxisAlignment.spaceBetween,
          children: [
            _buildProfileInfoCard('Mã thành viên', memberId, Colors.blue),
            _buildProfileInfoCard('Số dư', '$balance VNĐ', Colors.purple),
          ],
        ),
      ],
    );
  }

  // Helper method để tạo các thẻ thông tin người dùng
  Widget _buildProfileInfoCard(String label, String value, Color color) {
    return Expanded(
      child: Card(
        color: color,
        child: Padding(
          padding: const EdgeInsets.all(16.0),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: const TextStyle(color: Colors.white)),
              const SizedBox(height: 8),
              Text(
                value,
                style: const TextStyle(
                  color: Colors.white,
                  fontSize: 20,
                  fontWeight: FontWeight.bold,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  // Hiển thị danh sách các nút chức năng
  Widget _buildActionButtons(BuildContext context) {
    return Column(
      children: [
        _buildActionButton(Icons.post_add, 'Đăng tin mới', () {
          // Điều hướng tới trang đăng tin mới
        }),
        _buildActionButton(Icons.manage_accounts, 'Quản lý tin đăng', () {
          // Điều hướng tới trang quản lý tin đăng
        }),
        _buildActionButton(
            Icons.account_balance_wallet, 'Nạp tiền vào tài khoản', () {
          // Điều hướng tới trang nạp tiền
        }),
        _buildActionButton(Icons.history, 'Lịch sử nạp tiền', () {
          // Điều hướng tới trang lịch sử nạp tiền
        }),
        _buildActionButton(Icons.payment, 'Lịch sử thanh toán', () {
          // Điều hướng tới trang lịch sử thanh toán
        }),
        _buildActionButton(Icons.price_check, 'Bảng giá dịch vụ', () {
          // Điều hướng tới trang bảng giá dịch vụ
        }),
        _buildActionButton(Icons.edit, 'Sửa thông tin cá nhân', () {
          // Điều hướng tới trang sửa thông tin cá nhân
        }),
        _buildActionButton(Icons.favorite, 'Tin đã lưu', () {
          // Điều hướng tới trang tin đã lưu
        }),
        _buildActionButton(Icons.phone, 'Đổi số điện thoại', () {
          // Điều hướng tới trang đổi số điện thoại
        }),
        _buildActionButton(Icons.lock, 'Đổi mật khẩu', () {
          // Điều hướng tới trang đổi mật khẩu
        }),
      ],
    );
  }

  // Nút đăng xuất
  Widget _buildSignOutButton(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 16.0),
      child: ElevatedButton.icon(
        onPressed: () async {
          final prefs = await SharedPreferences.getInstance();
          await prefs.remove('token');
          setState(() {
            isLoggedIn = false;
          });
          Navigator.of(context).pushAndRemoveUntil(
            MaterialPageRoute(builder: (context) => Home()),
            (route) => false,
          );
        },
        icon: const Icon(Icons.logout),
        label: const Text('Đăng xuất'),
        style: ElevatedButton.styleFrom(backgroundColor: Colors.red),
      ),
    );
  }

  // Helper method để tạo các nút chức năng
  Widget _buildActionButton(IconData icon, String label, VoidCallback onTap) {
    return Card(
      child: ListTile(
        leading: Icon(icon, color: const Color.fromARGB(255, 4, 63, 111)),
        title: Text(label),
        trailing: const Icon(Icons.arrow_forward_ios, size: 16),
        onTap: onTap,
      ),
    );
  }
}
