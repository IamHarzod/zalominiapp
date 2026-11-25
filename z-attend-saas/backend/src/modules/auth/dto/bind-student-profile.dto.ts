import { IsNotEmpty, IsString, Length } from 'class-validator';

export class BindStudentProfileDto {
  @IsNotEmpty({ message: 'schoolName (Trường đang theo học) không được để trống' })
  @IsString()
  schoolName: string;

  @IsNotEmpty({ message: 'administrativeClass (Lớp sinh hoạt) không được để trống' })
  @IsString()
  administrativeClass: string;

  @IsNotEmpty({ message: 'studentCode (Mã số sinh viên) không được để trống' })
  @IsString()
  @Length(4, 20, { message: 'MSSV phải có độ dài từ 4 đến 20 ký tự' })
  studentCode: string;

  @IsNotEmpty({ message: 'phoneToken không được để trống' })
  @IsString()
  phoneToken: string;

  @IsNotEmpty({ message: 'fullName không được để trống' })
  @IsString()
  fullName: string;
}
