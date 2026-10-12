import mongoose from 'mongoose';

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true
    },
    passwordHash: {
      type: String,
      default: null
    },
    avatar: {
      type: String,
      default: ''
    },
    provider: {
      type: String,
      enum: ['local', 'google'],
      default: 'local'
    },
    googleId: {
      type: String,
      default: null,
      sparse: true
    },
    lastLogin: {
      type: Date,
      default: Date.now
    }
  },
  {
    timestamps: true
  }
);

// Strip password hash when converting to JSON
UserSchema.methods.toJSON = function () {
  const obj = this.toObject();
  delete obj.passwordHash;
  return obj;
};

const User = mongoose.models.User || mongoose.model('User', UserSchema);

export default User;
