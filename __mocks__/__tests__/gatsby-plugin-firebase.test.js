import { waitFor } from '@testing-library/react';
import FirebaseStub, {
  AuthConstants,
  DatabaseConstants,
} from '../gatsby-plugin-firebase';

describe('FirebaseStub', () => {
  describe('auth', () => {
    it('reuses existing Auth instance', () => {
      const auth1 = FirebaseStub.auth();
      const auth2 = FirebaseStub.auth();

      expect(auth1.uuid).toBeTruthy();
      expect(auth2.uuid).toBeTruthy();
      expect(auth1.uuid).toEqual(auth2.uuid);
    });

    it('returns anonymous user 1 when signing in anonymously', async () => {
      const user = await FirebaseStub.auth().signInAnonymously();

      expect(user).toBeTruthy();
      expect(user).toEqual(AuthConstants.anonymousUser1);
    });

    it('calls onAuthStateChanged observer with anonymous user 1 when signing in anonymously', async () => {
      let user = null;
      let error = null;
      FirebaseStub.auth().onAuthStateChanged(
        (_user) => {
          user = _user;
        },
        (_error) => {
          error = _error;
        },
      );

      await FirebaseStub.auth().signInAnonymously();

      expect(user).toBeTruthy();
      expect(user).toEqual(AuthConstants.anonymousUser1);
      expect(error).toBeNull();
    });

    it('onAuthStateChanged unsubscribe removes observer', () => {
      const observer = () => {};
      const unsubscribe = FirebaseStub.auth().onAuthStateChanged(observer);
      expect(unsubscribe).toBeTruthy();
      expect(
        FirebaseStub.auth().onAuthStateChangedObservers.indexOf(observer),
      ).toBeGreaterThanOrEqual(0);

      unsubscribe();

      expect(
        FirebaseStub.auth().onAuthStateChangedObservers.indexOf(observer),
      ).not.toBeGreaterThanOrEqual(0);
    });
  });

  describe('database', () => {
    beforeEach(() => {
      FirebaseStub.database().initializeData();
    });

    it('reuses existing Database instance', () => {
      const database1 = FirebaseStub.database();
      const database2 = FirebaseStub.database();

      expect(database1.uuid).toBeTruthy();
      expect(database2.uuid).toBeTruthy();
      expect(database1.uuid).toEqual(database2.uuid);
    });

    describe('ref function', () => {
      it('reuses existing Reference instance', () => {
        const ref1 = FirebaseStub.database().ref(
          `${DatabaseConstants.resumesPath}/123`,
        );
        const ref2 = FirebaseStub.database().ref(
          `${DatabaseConstants.resumesPath}/123`,
        );

        expect(ref1).toBeTruthy();
        expect(ref2).toBeTruthy();
        expect(ref1).toEqual(ref2);
      });

      it('leading slash in reference path is ignored', () => {
        const path = `${DatabaseConstants.resumesPath}/123`;

        const ref1 = FirebaseStub.database().ref(path);
        expect(ref1).toBeTruthy();
        expect(ref1.path).toEqual(path);

        const ref2 = FirebaseStub.database().ref(`/${path}`);
        expect(ref2).toBeTruthy();
        expect(ref2).toEqual(ref1);
      });
    });

    it('ServerValue.TIMESTAMP returns current time in milliseconds', () => {
      const now = new Date().getTime();
      const timestamp = FirebaseStub.database.ServerValue.TIMESTAMP;

      expect(timestamp).toBeTruthy();
      expect(timestamp).toBeGreaterThanOrEqual(now);
    });

    it('initializing data sets up resumes and users', async () => {
      const resumesRef = FirebaseStub.database().ref(
        DatabaseConstants.resumesPath,
      );
      const resumesDataSnapshot = await resumesRef.once('value');
      const resumes = resumesDataSnapshot.val();
      expect(resumes).toBeTruthy();
      expect(Object.keys(resumes)).toHaveLength(3);
      const demoStateResume1 = resumes[DatabaseConstants.demoStateResume1Id];
      expect(demoStateResume1).toBeTruthy();
      expect(demoStateResume1.id).toEqual(DatabaseConstants.demoStateResume1Id);
      expect(demoStateResume1.user).toEqual(DatabaseConstants.user1.uid);
      const demoStateResume2 = resumes[DatabaseConstants.demoStateResume2Id];
      expect(demoStateResume2).toBeTruthy();
      expect(demoStateResume2.id).toEqual(DatabaseConstants.demoStateResume2Id);
      expect(demoStateResume2.user).toEqual(DatabaseConstants.user2.uid);
      const initialStateResume =
        resumes[DatabaseConstants.initialStateResumeId];
      expect(initialStateResume).toBeTruthy();
      expect(initialStateResume.id).toEqual(
        DatabaseConstants.initialStateResumeId,
      );
      expect(initialStateResume.user).toEqual(DatabaseConstants.user1.uid);

      const usersRef = FirebaseStub.database().ref(DatabaseConstants.usersPath);
      const usersDataSnapshot = await usersRef.once('value');
      const users = usersDataSnapshot.val();
      expect(users).toBeTruthy();
      expect(Object.keys(users)).toHaveLength(2);
      const anonymousUser1 = users[DatabaseConstants.user1.uid];
      expect(anonymousUser1).toBeTruthy();
      expect(anonymousUser1).toEqual(DatabaseConstants.user1);
      const anonymousUser2 = users[DatabaseConstants.user2.uid];
      expect(anonymousUser2).toBeTruthy();
      expect(anonymousUser2).toEqual(DatabaseConstants.user2);
    });

    it('retrieves resume if it exists', async () => {
      const resume = (
        await FirebaseStub.database()
          .ref(
            `${DatabaseConstants.resumesPath}/${DatabaseConstants.demoStateResume1Id}`,
          )
          .once('value')
      ).val();

      expect(resume).toBeTruthy();
      expect(resume.id).toEqual(DatabaseConstants.demoStateResume1Id);
    });

    it('retrieves null if resume does not exist', async () => {
      const resumeId = 'invalidResumeId';

      const resume = (
        await FirebaseStub.database()
          .ref(`${DatabaseConstants.resumesPath}/${resumeId}`)
          .once('value')
      ).val();

      expect(resume).toBeNull();
    });

    it('retrieves user if it exists', async () => {
      const user = (
        await FirebaseStub.database()
          .ref(`${DatabaseConstants.usersPath}/${DatabaseConstants.user1.uid}`)
          .once('value')
      ).val();

      expect(user).toBeTruthy();
      expect(user).toEqual(DatabaseConstants.user1);
    });

    it('retrieves null if user does not exist', async () => {
      const userId = 'invalidUserId';

      const user = (
        await FirebaseStub.database()
          .ref(`${DatabaseConstants.usersPath}/${userId}`)
          .once('value')
      ).val();

      expect(user).toBeNull();
    });

    describe('on function', () => {
      describe('value event', () => {
        it('triggers event with true if on the connected reference path', async () => {
          let snapshotValue = null;

          FirebaseStub.database()
            .ref(DatabaseConstants.connectedPath)
            .on('value', (snapshot) => {
              snapshotValue = snapshot.val();
            });

          await waitFor(() =>
            snapshotValue ? Promise.resolve(true) : Promise.reject(),
          );

          expect(snapshotValue).not.toBeNull();
          expect(snapshotValue).toBe(true);
        });

        it('triggers event with resumes if on the resumes reference path', async () => {
          const resumesDataSnapshot = await FirebaseStub.database()
            .ref(DatabaseConstants.resumesPath)
            .once('value');
          const resumes = resumesDataSnapshot.val();
          let snapshotValue = null;

          FirebaseStub.database()
            .ref(DatabaseConstants.resumesPath)
            .on('value', (snapshot) => {
              snapshotValue = snapshot.val();
            });

          await waitFor(() =>
            snapshotValue ? Promise.resolve(true) : Promise.reject(),
          );

          expect(snapshotValue).not.toBeNull();
          expect(snapshotValue).toEqual(resumes);
        });
      });
    });

    it('can filter resumes by user', async () => {
      let snapshotValue = null;

      FirebaseStub.database()
        .ref(DatabaseConstants.resumesPath)
        .orderByChild('user')
        .equalTo(DatabaseConstants.user1.uid)
        .on('value', (snapshot) => {
          snapshotValue = snapshot.val();
        });

      await waitFor(() =>
        snapshotValue ? Promise.resolve(true) : Promise.reject(),
      );

      expect(snapshotValue).not.toBeNull();
      expect(Object.keys(snapshotValue)).toHaveLength(2);
      Object.values(snapshotValue).forEach((resume) =>
        expect(resume.user).toEqual(DatabaseConstants.user1.uid),
      );
    });

    it('previously set query parameters are not kept when retrieving reference again', () => {
      let reference = null;

      reference = FirebaseStub.database().ref(DatabaseConstants.resumesPath);
      expect(reference).toBeTruthy();
      const { uuid } = reference;
      expect(reference.orderByChildPath).toHaveLength(0);
      expect(reference.equalToValue).toHaveLength(0);

      reference = FirebaseStub.database()
        .ref(DatabaseConstants.resumesPath)
        .orderByChild('user')
        .equalTo('testuser1');
      expect(reference).toBeTruthy();
      expect(reference.uuid).toBe(uuid);
      expect(reference.orderByChildPath).toBe('user');
      expect(reference.equalToValue).toBe('testuser1');

      reference = FirebaseStub.database().ref(DatabaseConstants.resumesPath);
      expect(reference).toBeTruthy();
      expect(reference.uuid).toBe(uuid);
      expect(reference.orderByChildPath).toHaveLength(0);
      expect(reference.equalToValue).toHaveLength(0);
    });

    describe('set function', () => {
      it('inserts data', async () => {
        const existingResume = (
          await FirebaseStub.database()
            .ref(
              `${DatabaseConstants.resumesPath}/${DatabaseConstants.demoStateResume1Id}`,
            )
            .once('value')
        ).val();
        expect(existingResume).toBeTruthy();

        const newResume = JSON.parse(JSON.stringify(existingResume));
        newResume.id = 'newre1';
        newResume.name = `Test Resume ${newResume.id}`;
        await FirebaseStub.database()
          .ref(`${DatabaseConstants.resumesPath}/${newResume.id}`)
          .set(newResume);

        const actualResume = (
          await FirebaseStub.database()
            .ref(`${DatabaseConstants.resumesPath}/${newResume.id}`)
            .once('value')
        ).val();
        expect(actualResume).toBeTruthy();
        expect(actualResume).toEqual(newResume);
      });

      it('triggers events', async () => {
        let snapshotValue = null;
        const callback = jest.fn((snapshot) => {
          snapshotValue = snapshot.val();
        });
        FirebaseStub.database()
          .ref(DatabaseConstants.resumesPath)
          .orderByChild('user')
          .equalTo(DatabaseConstants.user1.uid)
          .on('value', callback);
        await waitFor(() => callback.mock.calls[0][0]);
        callback.mockClear();
        snapshotValue = null;

        const existingResume = (
          await FirebaseStub.database()
            .ref(
              `${DatabaseConstants.resumesPath}/${DatabaseConstants.demoStateResume1Id}`,
            )
            .once('value')
        ).val();
        expect(existingResume).toBeTruthy();

        const newResume = JSON.parse(JSON.stringify(existingResume));
        newResume.id = 'newre1';
        newResume.name = `Test Resume ${newResume.id}`;
        await FirebaseStub.database()
          .ref(`${DatabaseConstants.resumesPath}/${newResume.id}`)
          .set(newResume);

        await waitFor(() => callback.mock.calls[0][0]);

        expect(callback.mock.calls).toHaveLength(1);
        expect(snapshotValue).not.toBeNull();
        expect(Object.keys(snapshotValue)).toHaveLength(3);
        expect(snapshotValue[newResume.id]).toBeTruthy();
        expect(snapshotValue[newResume.id]).toEqual(newResume);
      });
    });

    describe('update function', () => {
      it('can spy on it', async () => {
        const referencePath = `${DatabaseConstants.resumesPath}/123456`;
        const functionSpy = jest.spyOn(
          FirebaseStub.database().ref(referencePath),
          'update',
        );
        const updateArgument = 'test value 123';

        await FirebaseStub.database().ref(referencePath).update(updateArgument);

        expect(functionSpy).toHaveBeenCalledTimes(1);
        const functionCallArgument = functionSpy.mock.calls[0][0];
        expect(functionCallArgument).toBeTruthy();
        expect(functionCallArgument).toEqual(updateArgument);
      });

      it('updates data', async () => {
        const resumeId = DatabaseConstants.demoStateResume1Id;
        const existingResume = (
          await FirebaseStub.database()
            .ref(`${DatabaseConstants.resumesPath}/${resumeId}`)
            .once('value')
        ).val();
        expect(existingResume).toBeTruthy();

        const resumeName = 'Test Resume renamed';
        existingResume.name = resumeName;
        await FirebaseStub.database()
          .ref(`${DatabaseConstants.resumesPath}/${resumeId}`)
          .update(existingResume);

        const actualResume = (
          await FirebaseStub.database()
            .ref(`${DatabaseConstants.resumesPath}/${resumeId}`)
            .once('value')
        ).val();
        expect(actualResume).toBeTruthy();
        expect(existingResume).toEqual(actualResume);
        expect(actualResume.name).toEqual(resumeName);
      });

      it('triggers events', async () => {
        let snapshotValue = null;
        const callback = jest.fn((snapshot) => {
          snapshotValue = snapshot.val();
        });
        FirebaseStub.database()
          .ref(DatabaseConstants.resumesPath)
          .orderByChild('user')
          .equalTo(DatabaseConstants.user1.uid)
          .on('value', callback);
        await waitFor(() => callback.mock.calls[0][0]);
        callback.mockClear();
        snapshotValue = null;

        const existingResume = (
          await FirebaseStub.database()
            .ref(
              `${DatabaseConstants.resumesPath}/${DatabaseConstants.demoStateResume1Id}`,
            )
            .once('value')
        ).val();
        expect(existingResume).toBeTruthy();

        existingResume.name = 'Test Resume renamed';
        await FirebaseStub.database()
          .ref(`${DatabaseConstants.resumesPath}/${existingResume.id}`)
          .update(existingResume);

        await waitFor(() => callback.mock.calls[0][0]);

        expect(callback.mock.calls).toHaveLength(1);
        expect(snapshotValue).not.toBeNull();
        expect(Object.keys(snapshotValue)).toHaveLength(2);
        expect(snapshotValue[existingResume.id]).toBeTruthy();
        expect(snapshotValue[existingResume.id]).toEqual(existingResume);
      });
    });

    describe('remove function', () => {
      it('deletes data', async () => {
        const resumeId = DatabaseConstants.demoStateResume1Id;
        const removedResume = (
          await FirebaseStub.database()
            .ref(`${DatabaseConstants.resumesPath}/${resumeId}`)
            .once('value')
        ).val();
        expect(removedResume).toBeTruthy();

        await FirebaseStub.database()
          .ref(`${DatabaseConstants.resumesPath}/${resumeId}`)
          .remove();

        const actualResume = (
          await FirebaseStub.database()
            .ref(`${DatabaseConstants.resumesPath}/${resumeId}`)
            .once('value')
        ).val();
        expect(actualResume).toBeNull();
      });

      it('triggers events', async () => {
        const userUid = DatabaseConstants.user1.uid;

        let valueCallbackSnapshotValue = null;
        const valueCallback = jest.fn((snapshot) => {
          valueCallbackSnapshotValue = snapshot.val();
        });
        FirebaseStub.database()
          .ref(DatabaseConstants.resumesPath)
          .orderByChild('user')
          .equalTo(userUid)
          .on('value', valueCallback);
        await waitFor(() => valueCallback.mock.calls[0][0]);
        valueCallback.mockClear();
        valueCallbackSnapshotValue = null;

        let childRemovedCallbackSnapshotValue = null;
        const childRemovedCallback = jest.fn((snapshot) => {
          childRemovedCallbackSnapshotValue = snapshot.val();
        });
        FirebaseStub.database()
          .ref(DatabaseConstants.resumesPath)
          .orderByChild('user')
          .equalTo(userUid)
          .on('child_removed', childRemovedCallback);

        const removedResume = (
          await FirebaseStub.database()
            .ref(
              `${DatabaseConstants.resumesPath}/${DatabaseConstants.demoStateResume1Id}`,
            )
            .once('value')
        ).val();
        expect(removedResume).toBeTruthy();
        expect(removedResume.user).toEqual(userUid);
        await FirebaseStub.database()
          .ref(`${DatabaseConstants.resumesPath}/${removedResume.id}`)
          .remove();

        await waitFor(() => childRemovedCallback.mock.calls[0][0]);
        expect(childRemovedCallback.mock.calls).toHaveLength(1);
        expect(childRemovedCallbackSnapshotValue).toBeTruthy();
        expect(childRemovedCallbackSnapshotValue).toEqual(removedResume);

        await waitFor(() => valueCallback.mock.calls[0][0]);
        expect(valueCallback.mock.calls).toHaveLength(1);
        expect(valueCallbackSnapshotValue).toBeTruthy();
        expect(removedResume.id in valueCallbackSnapshotValue).toBe(false);
      });
    });

    describe('off function', () => {
      it('removes event callbacks', async () => {
        const userUid = DatabaseConstants.user1.uid;

        let valueCallbackSnapshotValue = null;
        const valueCallback = jest.fn((snapshot) => {
          valueCallbackSnapshotValue = snapshot.val();
        });
        FirebaseStub.database()
          .ref(DatabaseConstants.resumesPath)
          .orderByChild('user')
          .equalTo(userUid)
          .on('value', valueCallback);
        await waitFor(() => valueCallback.mock.calls[0][0]);
        valueCallback.mockClear();
        valueCallbackSnapshotValue = null;

        let childRemovedCallbackSnapshotValue = null;
        const childRemovedCallback = jest.fn((snapshot) => {
          childRemovedCallbackSnapshotValue = snapshot.val();
        });
        FirebaseStub.database()
          .ref(DatabaseConstants.resumesPath)
          .orderByChild('user')
          .equalTo(userUid)
          .on('child_removed', childRemovedCallback);

        const removedResume = (
          await FirebaseStub.database()
            .ref(
              `${DatabaseConstants.resumesPath}/${DatabaseConstants.demoStateResume1Id}`,
            )
            .once('value')
        ).val();
        expect(removedResume).toBeTruthy();

        FirebaseStub.database().ref(DatabaseConstants.resumesPath).off();

        await FirebaseStub.database()
          .ref(`${DatabaseConstants.resumesPath}/${removedResume.id}`)
          .remove();

        expect(childRemovedCallback.mock.calls).toHaveLength(0);
        expect(childRemovedCallbackSnapshotValue).toBeNull();
        expect(valueCallback.mock.calls).toHaveLength(0);
        expect(valueCallbackSnapshotValue).toBeNull();
      });
    });
  });
});
